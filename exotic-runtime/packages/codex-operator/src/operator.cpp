#include "exotic/codex_operator/operator.hpp"

#include <chrono>

namespace exotic::codex_operator {

namespace {

std::shared_ptr<StructuredLogSink> default_sink_for(const OperatorConfig& config) {
    if (config.structured_logs_to_file) {
        return std::make_shared<JsonLineLogSink>(config.log_path);
    }
    return std::make_shared<MemoryLogSink>();
}

std::shared_ptr<Runtime> alias_runtime(Runtime& runtime) {
    return std::shared_ptr<Runtime>(&runtime, [](Runtime*) {});
}

std::shared_ptr<StructuredLogger> alias_logger(StructuredLogger& logger) {
    return std::shared_ptr<StructuredLogger>(&logger, [](StructuredLogger*) {});
}

std::shared_ptr<MetricsCollector> alias_metrics(MetricsCollector& metrics) {
    return std::shared_ptr<MetricsCollector>(&metrics, [](MetricsCollector*) {});
}

std::shared_ptr<HealthMonitor> alias_health(HealthMonitor& health) {
    return std::shared_ptr<HealthMonitor>(&health, [](HealthMonitor*) {});
}

} // namespace

CodexOperatorPackage::CodexOperatorPackage(Runtime& runtime,
                                           OperatorConfig config,
                                           std::shared_ptr<StructuredLogSink> sink)
    : runtime_(runtime),
      configuration_(std::move(config)),
      logger_(configuration_.config().minimum_log_level),
      primary_sink_(sink ? std::move(sink) : default_sink_for(configuration_.config())),
      metrics_(configuration_.config().workspace_id),
      lifecycle_(logger_, metrics_, health_),
      event_bridge_(runtime.events(), logger_, metrics_),
      plugins_(logger_) {
    logger_.add_sink(primary_sink_);
}

void CodexOperatorPackage::initialize() {
    if (state_ != PackageState::Created) {
        return;
    }
    configuration_.config().validate();
    configuration_.load_file(configuration_.config().state_root / "config" / "codex-operator.conf");
    configuration_.config().validate();
    logger_.set_minimum_level(configuration_.config().minimum_log_level);
    register_container_bindings();
    register_core_services();
    plugins_.install_all(*this);
    lifecycle_.recover(services_);
    event_bridge_.start();
    state_ = PackageState::Initialized;
    logger_.info("package", "codex operator initialized", {{"workspace_id", configuration_.config().workspace_id}});
}

void CodexOperatorPackage::start() {
    if (state_ == PackageState::Running) {
        return;
    }
    if (state_ == PackageState::Created) {
        initialize();
    }
    const auto started = std::chrono::steady_clock::now();
    lifecycle_.start(services_);
    metrics_.set_active_workers(configuration_.config().scheduler_workers);
    metrics_.note_startup_time(std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - started));
    state_ = health_.summary().ready ? PackageState::Running : PackageState::Failed;
    logger_.info("package", "codex operator started", {{"state", to_string(state_)}});
}

void CodexOperatorPackage::shutdown() noexcept {
    if (state_ == PackageState::Stopped || state_ == PackageState::Created) {
        return;
    }
    event_bridge_.stop();
    lifecycle_.shutdown(services_);
    metrics_.set_active_workers(0);
    state_ = PackageState::Stopped;
    logger_.info("package", "codex operator stopped", {{"state", to_string(state_)}});
}

void CodexOperatorPackage::register_service(std::shared_ptr<runtime::RuntimeService> service) {
    services_.add(std::move(service));
}

void CodexOperatorPackage::register_plugin(std::shared_ptr<OperatorPlugin> plugin) {
    plugins_.register_plugin(std::move(plugin));
}

PackageSnapshot CodexOperatorPackage::snapshot() const {
    return {
        state_,
        metrics_.snapshot(),
        health_.summary(),
        services_.size(),
        plugins_.descriptors().size()
    };
}

PackageState CodexOperatorPackage::state() const noexcept {
    return state_;
}

Runtime& CodexOperatorPackage::runtime() noexcept {
    return runtime_;
}

const OperatorConfig& CodexOperatorPackage::config() const noexcept {
    return configuration_.config();
}

StructuredLogger& CodexOperatorPackage::logger() noexcept {
    return logger_;
}

MetricsCollector& CodexOperatorPackage::metrics() noexcept {
    return metrics_;
}

HealthMonitor& CodexOperatorPackage::health() noexcept {
    return health_;
}

OperatorServiceRegistry& CodexOperatorPackage::services() noexcept {
    return services_;
}

PluginRegistry& CodexOperatorPackage::plugins() noexcept {
    return plugins_;
}

DependencyContainer& CodexOperatorPackage::container() noexcept {
    return container_;
}

std::unique_ptr<PromptCompiler> CodexOperatorPackage::create_prompt_compiler() {
    return std::make_unique<PromptCompiler>(runtime_, logger_, metrics_);
}

std::unique_ptr<WorkerRuntime> CodexOperatorPackage::create_worker_runtime() {
    return std::make_unique<WorkerRuntime>(runtime_, logger_, metrics_);
}

std::unique_ptr<SessionEngine> CodexOperatorPackage::create_session_engine() {
    auto prompt_compiler = create_prompt_compiler();
    auto worker_runtime = create_worker_runtime();
    worker_runtime->register_default_workers();
    return std::make_unique<SessionEngine>(
        runtime_,
        logger_,
        metrics_,
        std::move(prompt_compiler),
        std::move(worker_runtime));
}

std::unique_ptr<VerificationEngine> CodexOperatorPackage::create_verification_engine(SessionEngine& session_engine) {
    return std::make_unique<VerificationEngine>(runtime_, logger_, metrics_, session_engine);
}

std::unique_ptr<GovernanceEngine> CodexOperatorPackage::create_governance_engine(SessionEngine& session_engine,
                                                                                 VerificationEngine& verification_engine) {
    return std::make_unique<GovernanceEngine>(runtime_, logger_, metrics_, session_engine, verification_engine);
}

std::unique_ptr<PolicyAutomationEngine> CodexOperatorPackage::create_policy_automation_engine(SessionEngine& session_engine,
                                                                                              VerificationEngine& verification_engine,
                                                                                              GovernanceEngine& governance_engine) {
    return std::make_unique<PolicyAutomationEngine>(
        runtime_,
        logger_,
        metrics_,
        session_engine,
        verification_engine,
        governance_engine);
}

std::unique_ptr<ComplianceEngine> CodexOperatorPackage::create_compliance_engine(SessionEngine& session_engine,
                                                                                 VerificationEngine& verification_engine,
                                                                                 GovernanceEngine& governance_engine,
                                                                                 PolicyAutomationEngine& policy_automation_engine) {
    return std::make_unique<ComplianceEngine>(
        runtime_,
        logger_,
        metrics_,
        session_engine,
        verification_engine,
        governance_engine,
        policy_automation_engine);
}

std::unique_ptr<ObservabilityEngine> CodexOperatorPackage::create_observability_engine(SessionEngine& session_engine,
                                                                                       VerificationEngine& verification_engine,
                                                                                       GovernanceEngine& governance_engine,
                                                                                       PolicyAutomationEngine& policy_automation_engine,
                                                                                       ComplianceEngine& compliance_engine) {
    return std::make_unique<ObservabilityEngine>(
        runtime_,
        logger_,
        metrics_,
        session_engine,
        verification_engine,
        governance_engine,
        policy_automation_engine,
        compliance_engine);
}

void CodexOperatorPackage::register_core_services() {
    if (core_services_registered_) {
        return;
    }

    register_service(std::make_shared<OperatorRuntimeService>(ServiceRegistration{
        "runtime-kernel",
        {},
        [] {},
        [] {},
        [] {},
        [] {},
        [this] {
            runtime::ServiceHealth health;
            health.service = "runtime-kernel";
            health.state = runtime::ServiceState::Running;
            health.level = runtime::HealthLevel::Healthy;
            health.message = "kernel online";
            health.measurements["memory_records"] = static_cast<double>(runtime_.memory().size());
            return health;
        }
    }));

    register_service(std::make_shared<OperatorRuntimeService>(ServiceRegistration{
        "event-bus",
        {"runtime-kernel"},
        [] {},
        [] {},
        [] {},
        [] {},
        [this] {
            runtime::ServiceHealth health;
            health.service = "event-bus";
            health.state = event_bridge_.running() ? runtime::ServiceState::Running : runtime::ServiceState::Starting;
            health.level = runtime::HealthLevel::Healthy;
            health.message = "event bus integrated";
            return health;
        }
    }));

    register_service(std::make_shared<OperatorRuntimeService>(ServiceRegistration{
        "graph-runtime",
        {"runtime-kernel"},
        [] {},
        [] {},
        [] {},
        [] {},
        [this] {
            runtime::ServiceHealth health;
            health.service = "graph-runtime";
            health.state = runtime::ServiceState::Running;
            health.level = runtime::HealthLevel::Healthy;
            health.message = "universal graph runtime integrated";
            health.measurements["entities"] = static_cast<double>(runtime_.graph().entity_count());
            health.measurements["relationships"] = static_cast<double>(runtime_.graph().relationship_count());
            return health;
        }
    }));

    core_services_registered_ = true;
}

void CodexOperatorPackage::register_container_bindings() {
    if (!container_.contains<Runtime>()) {
        container_.register_instance<Runtime>(alias_runtime(runtime_));
    }
    if (!container_.contains<StructuredLogger>()) {
        container_.register_instance<StructuredLogger>(alias_logger(logger_));
    }
    if (!container_.contains<MetricsCollector>()) {
        container_.register_instance<MetricsCollector>(alias_metrics(metrics_));
    }
    if (!container_.contains<HealthMonitor>()) {
        container_.register_instance<HealthMonitor>(alias_health(health_));
    }
}

} // namespace exotic::codex_operator
