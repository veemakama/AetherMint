#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AnalyticsRecord {
    pub timestamp: u64,
    pub total_users: u64,
    pub total_courses: u64,
    pub total_completions: u64,
    pub avg_progress_bps: u32, // Basis points (0-10000)
}

#[contracttype]
pub enum AnalyticsDataKey {
    Admin,
    History,
}

#[contract]
pub struct AnalyticsContract;

#[contractimpl]
impl AnalyticsContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&AnalyticsDataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&AnalyticsDataKey::Admin, &admin);
        let history: Vec<AnalyticsRecord> = Vec::new(&env);
        env.storage().instance().set(&AnalyticsDataKey::History, &history);
    }

    /// Record new analytics data (Admin only)
    pub fn record_metrics(
        env: Env, 
        total_users: u64, 
        total_courses: u64, 
        total_completions: u64, 
        avg_progress_bps: u32
    ) {
        let admin: Address = env.storage().instance().get(&AnalyticsDataKey::Admin).unwrap();
        admin.require_auth();

        let mut history: Vec<AnalyticsRecord> = env.storage().instance().get(&AnalyticsDataKey::History).unwrap_or(Vec::new(&env));
        
        let record = AnalyticsRecord {
            timestamp: env.ledger().timestamp(),
            total_users,
            total_courses,
            total_completions,
            avg_progress_bps,
        };

        history.push_back(record);
        env.storage().instance().set(&AnalyticsDataKey::History, &history);
    }

    /// Get the full history of analytics
    pub fn get_history(env: Env) -> Vec<AnalyticsRecord> {
        env.storage().instance().get(&AnalyticsDataKey::History).unwrap_or(Vec::new(&env))
    }
    
    /// Get the most recent analytics record
    pub fn get_latest(env: Env) -> Option<AnalyticsRecord> {
        let history: Vec<AnalyticsRecord> = env.storage().instance().get(&AnalyticsDataKey::History).unwrap_or(Vec::new(&env));
        if history.is_empty() {
            None
        } else {
            Some(history.get(history.len() - 1).unwrap())
        }
    }
}