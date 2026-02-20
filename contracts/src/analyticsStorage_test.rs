#![cfg(test)]
extern crate std;

use crate::analyticsStorage::{AnalyticsContract, AnalyticsContractClient};
use soroban_sdk::{testutils::{Address as _, Ledger}, Env, Address};

#[test]
fn test_analytics_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, AnalyticsContract);
    let client = AnalyticsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    // Initialize
    client.initialize(&admin);

    // Record metrics
    let total_users = 100;
    let total_courses = 5;
    let total_completions = 20;
    let avg_progress = 7500; // 75.00%

    client.record_metrics(&total_users, &total_courses, &total_completions, &avg_progress);

    // Verify latest
    let latest = client.get_latest().unwrap();
    assert_eq!(latest.total_users, total_users);
    assert_eq!(latest.avg_progress_bps, avg_progress);

    // Record another
    env.ledger().set_timestamp(1000);
    client.record_metrics(&110, &6, &25, &7600);

    // Verify history
    let history = client.get_history();
    assert_eq!(history.len(), 2);
    assert_eq!(history.get(1).unwrap().timestamp, 1000);
}