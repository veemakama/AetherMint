#![cfg(test)]

use crate::{AetherMintContract, AetherMintContractClient};
use soroban_sdk::{testutils::Address as _, Env, Address};

#[test]
fn test_governance_flow() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register_contract(None, AetherMintContract);
    let client = AetherMintContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token);

    // Initial reputation check
    let profile = client.get_profile(&user);
    assert_eq!(profile.reputation, 0);

    // Create a proposal
    let proposal_id = client.propose(&user, &"Test Proposal".to_string(&env), &"Description".to_string(&env));
    assert_eq!(proposal_id, 1);

    // Vote on the proposal
    client.vote(&user, &proposal_id, &1); // 1 = For

    let proposal = client.get_proposal(&proposal_id);
    assert!(proposal.for_votes > 0);
}
