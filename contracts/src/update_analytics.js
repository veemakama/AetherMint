const { Client } = require('pg');
const { Keypair, Contract, Networks, SorobanRpc, TransactionBuilder, TimeoutInfinite } = require('@stellar/stellar-sdk');
require('dotenv').config();

async function main() {
  console.log('Starting analytics update...');

  // 1. Fetch Data from Database
  const dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await dbClient.connect();
    console.log('Connected to database.');
    
    // Aggregate metrics
    // Note: Adjust table names if they differ in production schema
    const usersRes = await dbClient.query('SELECT COUNT(*) as count FROM users');
    const coursesRes = await dbClient.query('SELECT COUNT(*) as count FROM courses');
    const completionsRes = await dbClient.query('SELECT COUNT(*) as count FROM user_progress WHERE completed = true');
    const progressRes = await dbClient.query('SELECT AVG(progress) as avg FROM user_progress');

    const totalUsers = parseInt(usersRes.rows[0].count || '0');
    const totalCourses = parseInt(coursesRes.rows[0].count || '0');
    const totalCompletions = parseInt(completionsRes.rows[0].count || '0');
    const avgProgress = parseFloat(progressRes.rows[0].avg || '0');
    const avgProgressBps = Math.round(avgProgress * 100); // Convert to basis points

    console.log(`Metrics gathered: Users=${totalUsers}, Courses=${totalCourses}, Completions=${totalCompletions}, AvgProgress=${avgProgress}%`);

    // 2. Submit to Blockchain
    const rpcUrl = process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
    const server = new SorobanRpc.Server(rpcUrl);
    const networkPassphrase = Networks.TESTNET;
    const contractId = process.env.ANALYTICS_CONTRACT_ID;
    const adminKey = process.env.ADMIN_PRIVATE_KEY;

    if (!contractId || !adminKey) {
      console.log('Missing contract ID or admin key. Skipping blockchain update.');
      return;
    }

    const sourceKeypair = Keypair.fromSecret(adminKey);
    const account = await server.getAccount(sourceKeypair.publicKey());

    const contract = new Contract(contractId);
    
    // Build transaction to call record_metrics
    const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase })
      .addOperation(contract.call(
        'record_metrics',
        totalUsers,
        totalCourses,
        totalCompletions,
        avgProgressBps
      ))
      .setTimeout(TimeoutInfinite)
      .build();

    tx.sign(sourceKeypair);

    const sendResponse = await server.sendTransaction(tx);

    if (sendResponse.status !== 'PENDING') {
      console.error('Transaction failed:', sendResponse);
    } else {
      console.log(`Transaction sent! Hash: ${sendResponse.hash}`);
      // In a real script, we might wait for confirmation here
    }

  } catch (err) {
    console.error('Error updating analytics:', err);
    process.exit(1);
  } finally {
    await dbClient.end();
  }
}

main();