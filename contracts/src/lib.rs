#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec, String};

mod governance;
mod test;

use crate::governance::{Governance, Proposal, ProposalStatus, GovernanceDataKey};

#[contracttype]
pub enum DataKey {
    Credential(u64),
    CredentialCount,
    Admin,
    Profile(Address),
    GovernanceToken,
}

#[contracttype]
pub struct Credential {
    pub id: u64,
    pub issuer: Address,
    pub recipient: Address,
    pub title: String,
    pub description: String,
    pub course_id: String,
    pub completion_date: u64,
    pub ipfs_hash: String,
    pub is_verified: bool,
}

#[contracttype]
pub struct Course {
    pub id: String,
    pub instructor: Address,
    pub title: String,
    pub description: String,
    pub price: u64,
    pub is_active: bool,
}

#[contracttype]
pub struct Profile {
    pub owner: Address,
    pub credentials: Vec<u64>,
    pub achievements: Vec<u64>,
    pub reputation: u64,
}

#[contract]
pub struct AetherMintContract;

#[contractimpl]
impl AetherMintContract {
    /// Initialize the contract with an admin address and governance token
    pub fn initialize(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::CredentialCount, &0u64);
        env.storage().instance().set(&DataKey::GovernanceToken, &token);
    }

    // --- Governance Methods ---

    pub fn propose(env: Env, proposer: Address, title: String, description: String) -> u64 {
        // Simple quorum for now
        let quorum = 100i128;
        let voting_period = 604800; // 1 week in seconds
        
        let id = Governance::create_proposal(env.clone(), proposer.clone(), title, description, voting_period, quorum);
        
        // Emit Event
        env.events().publish(
            (Symbol::new(&env, "proposal_created"), id),
            proposer
        );
        
        id
    }

    pub fn vote(env: Env, voter: Address, proposal_id: u64, support: u32) {
        let profile = Self::get_profile(env.clone(), voter.clone());
        let token: Address = env.storage().instance().get(&DataKey::GovernanceToken).unwrap();
        
        let power = Governance::get_voting_power(&env, voter.clone(), token, profile.reputation);
        
        Governance::cast_vote(env.clone(), voter.clone(), proposal_id, support, power);
        
        // Emit Event
        env.events().publish(
            (Symbol::new(&env, "vote_cast"), proposal_id, voter),
            (support, power)
        );
    }

    pub fn execute(env: Env, proposal_id: u64) {
        Governance::execute_proposal(env.clone(), proposal_id);
    }

    pub fn deposit(env: Env, amount: i128) {
        Governance::deposit_to_treasury(env, amount);
    }

    pub fn get_treasury_balance(env: Env) -> i128 {
        env.storage().instance()
            .get(&GovernanceDataKey::TreasuryBalance)
            .unwrap_or(0)
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Proposal {
        env.storage().instance()
            .get(&GovernanceDataKey::Proposal(proposal_id))
            .expect("Proposal not found")
    }

    pub fn delegate(env: Env, from: Address, to: Address) {
        Governance::delegate(env, from, to);
    }

    pub fn get_delegate(env: Env, voter: Address) -> Address {
        Governance::get_delegate(&env, voter)
    }

    // --- Original methods with some updates ---

    /// Issue a new credential
    pub fn issue_credential(
        env: Env,
        issuer: Address,
        recipient: Address,
        title: String,
        description: String,
        course_id: String,
        ipfs_hash: String,
    ) -> u64 {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Admin not found"));

        if issuer != admin {
            panic!("Only admin can issue credentials");
        }

        let count: u64 = env.storage().instance()
            .get(&DataKey::CredentialCount)
            .unwrap_or(0);
        let credential_id = count + 1;

        let credential = Credential {
            id: credential_id,
            issuer: issuer.clone(),
            recipient: recipient.clone(),
            title,
            description,
            course_id,
            completion_date: env.ledger().timestamp(),
            ipfs_hash,
            is_verified: false,
        };

        env.storage().instance().set(&DataKey::Credential(credential_id), &credential);
        env.storage().instance().set(&DataKey::CredentialCount, &credential_id);

        // Update reputation for recipient
        let mut profile = Self::get_profile(env.clone(), recipient.clone());
        profile.reputation += 10; // Bonus for earning a credential
        env.storage().instance().set(&DataKey::Profile(recipient), &profile);

        credential_id
    }

    /// Verify a credential
    pub fn verify_credential(env: Env, credential_id: u64) -> bool {
        let mut credential: Credential = env.storage().instance()
            .get(&DataKey::Credential(credential_id))
            .unwrap_or_else(|| panic!("Credential not found"));

        credential.is_verified = true;
        env.storage().instance().set(&DataKey::Credential(credential_id), &credential);

        true
    }

    /// Get user profile
    pub fn get_profile(env: Env, user: Address) -> Profile {
        env.storage().instance()
            .get(&DataKey::Profile(user.clone()))
            .unwrap_or_else(|| Profile {
                owner: user.clone(),
                credentials: Vec::new(&env),
                achievements: Vec::new(&env),
                reputation: 0,
            })
    }

    pub fn create_course(
        env: Env,
        instructor: Address,
        title: String,
        description: String,
        price: u64,
    ) -> String {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Admin not found"));

        if instructor != admin {
            panic!("Only admin can create courses");
        }

        let course_id = format!("course_{}", env.ledger().timestamp());
        let course = Course {
            id: course_id.clone(),
            instructor: instructor.clone(),
            title,
            description,
            price,
            is_active: true,
        };

        env.storage().instance().set(&DataKey::Credential(env.ledger().timestamp()), &course);

        course_id
    }

    pub fn get_credential_count(env: Env) -> u64 {
        env.storage().instance()
            .get(&DataKey::CredentialCount)
            .unwrap_or(0)
    }
}
