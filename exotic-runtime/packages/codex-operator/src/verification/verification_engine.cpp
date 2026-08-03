#include "exotic/codex_operator/operator.hpp"

#include <algorithm>
#include <sstream>

namespace exotic::codex_operator {

namespace {

std::string next_verification_id() {
    return std::to_string(std::chrono::duration_cast<std::chrono::microseconds>(
        Clock::now().time_since_epoch()).count());
}

std::string json_quote(std::string_view value) {
    std::ostringstream out;
    out << '"';
    for (const char ch : value) {
        switch (ch) {
        case '\\': out << "\\\\"; break;
        case '"': out << "\\\""; break;
        case '\n': out << "\\n"; break;
        case '\r': out << "\\r"; break;
        case '\t': out << "\\t"; break;
        default: out << ch; break;
        }
    }
    out << '"';
    return out.str();
}

std::string json_array(const std::vector<std::string>& values) {
    std::ostringstream out;
    out << "[";
    for (std::size_t index = 0; index < values.size(); ++index) {
        if (index != 0) {
            out << ",";
        }
        out << json_quote(values[index]);
    }
    out << "]";
    return out.str();
}

bool contains_named_file(const std::vector<std::string>& files, std::string_view fragment) {
    return std::any_of(files.begin(), files.end(), [&](const std::string& file) {
        return file.find(fragment) != std::string::npos;
    });
}

} // namespace

VerificationEngineApi::VerificationEngineApi(const std::vector<VerificationRequest>* requests,
                                             const std::vector<VerificationResult>* results,
                                             const EvidenceStore& evidence_store,
                                             const VerificationMetrics* metrics)
    : requests_(requests), results_(results), evidence_store_(evidence_store), metrics_(metrics) {}

ApiResponse VerificationEngineApi::handle(const ApiRequest& request) const {
    if (request.path == "/verification-requests") {
        std::vector<std::string> values;
        for (const auto& item : *requests_) {
            values.push_back(item.session_id + ":" + item.id);
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/verification-results") {
        std::vector<std::string> values;
        for (const auto& item : *results_) {
            values.push_back(item.session_id + ":" + to_string(item.status));
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/evidence") {
        std::vector<std::string> values;
        for (const auto& artifact : evidence_store_.list()) {
            values.push_back(artifact.session_id + ":" + artifact.id + ":" + to_string(artifact.kind));
        }
        return {200, "application/json", json_array(values)};
    }
    if (request.path == "/verification-metrics") {
        std::ostringstream out;
        out << "{"
            << "\"total_requests\":" << metrics_->total_requests << ","
            << "\"passed\":" << metrics_->passed << ","
            << "\"failed\":" << metrics_->failed << ","
            << "\"rejected\":" << metrics_->rejected << ","
            << "\"evidence_artifacts\":" << metrics_->evidence_artifacts
            << "}";
        return {200, "application/json", out.str()};
    }
    return {404, "application/json", "{\"error\":\"not_found\"}"};
}

VerificationEngine::VerificationEngine(Runtime& runtime,
                                       StructuredLogger& logger,
                                       MetricsCollector& metrics,
                                       SessionEngine& session_engine)
    : runtime_(runtime),
      logger_(logger),
      metrics_(metrics),
      session_engine_(session_engine),
      events_(runtime.events()) {}

VerificationRequest VerificationEngine::create_request(std::string_view session_id) {
    const auto session = session_engine_.find(session_id);
    if (!session) {
        throw OperatorError(ErrorCode::LifecycleFailure, "session not found for verification request");
    }

    VerificationRequest request;
    request.id = std::string(session_id) + ".verification." + next_verification_id();
    request.session_id = std::string(session_id);
    request.minimum_evidence_count = std::max<std::size_t>(1, session->constraints.required_tests.size() + session->constraints.required_documentation.size());
    request.require_tests = !session->constraints.required_tests.empty();
    request.require_documentation = !session->constraints.required_documentation.empty();
    request.require_review = session->constraints.review_required;
    request.require_build = session->constraints.build_required;
    request.rules.push_back({"rule.session.completed", "Session must complete successfully.", true});
    if (request.require_tests) {
        request.rules.push_back({"rule.tests.present", "Required test evidence must be present.", true});
    }
    if (request.require_documentation) {
        request.rules.push_back({"rule.docs.present", "Required documentation evidence must be present.", true});
    }
    if (request.require_review) {
        request.rules.push_back({"rule.review.present", "Review evidence must be present.", true});
    }
    if (request.require_build) {
        request.rules.push_back({"rule.build.present", "Build evidence must be present.", true});
    }

    {
        std::scoped_lock lock(mutex_);
        requests_.push_back(request);
    }
    emit(VerificationEventKind::VerificationRequested, request.session_id, request.id);
    refresh_metrics();
    return request;
}

void VerificationEngine::record_evidence(EvidenceArtifact artifact) {
    evidence_store_.record(artifact);
    emit(VerificationEventKind::EvidenceRecorded, artifact.session_id, artifact.id);
    refresh_metrics();
}

VerificationResult VerificationEngine::verify(std::string_view request_id) {
    const auto started = std::chrono::steady_clock::now();
    const auto request = require_request(request_id);
    const auto session = session_engine_.find(request.session_id);
    if (!session) {
        throw OperatorError(ErrorCode::LifecycleFailure, "session not found for verification");
    }

    emit(VerificationEventKind::VerificationStarted, request.session_id, request.id);

    auto evidence = evidence_store_.find_by_session(request.session_id);
    for (const auto& item : session->evidence) {
        EvidenceArtifact artifact;
        artifact.id = item.id;
        artifact.session_id = request.session_id;
        artifact.kind = EvidenceKind::WorkerOutput;
        artifact.summary = item.summary;
        artifact.files = item.files;
        artifact.metadata["worker_id"] = item.worker_id;
        evidence.push_back(std::move(artifact));
    }

    VerificationResult result;
    result.request_id = request.id;
    result.session_id = request.session_id;
    result.status = VerificationStatus::Running;

    if (session->status == SessionStatus::Completed) {
        result.satisfied_rules.push_back("rule.session.completed");
    } else {
        result.violations.push_back("session is not completed");
    }

    if (evidence.size() >= request.minimum_evidence_count) {
        result.satisfied_rules.push_back("rule.evidence.minimum");
    } else {
        result.violations.push_back("insufficient evidence artifacts");
    }

    if (request.require_tests) {
        bool ok = false;
        for (const auto& test_name : session->constraints.required_tests) {
            ok = ok || std::any_of(evidence.begin(), evidence.end(), [&](const EvidenceArtifact& artifact) {
                return artifact.kind == EvidenceKind::TestResult
                    || contains_named_file(artifact.files, test_name)
                    || artifact.summary.find(test_name) != std::string::npos;
            });
        }
        if (ok) result.satisfied_rules.push_back("rule.tests.present");
        else result.violations.push_back("required test evidence missing");
    }

    if (request.require_documentation) {
        bool ok = false;
        for (const auto& doc_name : session->constraints.required_documentation) {
            ok = ok || std::any_of(evidence.begin(), evidence.end(), [&](const EvidenceArtifact& artifact) {
                return artifact.kind == EvidenceKind::Documentation
                    || contains_named_file(artifact.files, doc_name)
                    || artifact.summary.find(doc_name) != std::string::npos;
            });
        }
        if (ok) result.satisfied_rules.push_back("rule.docs.present");
        else result.violations.push_back("required documentation evidence missing");
    }

    if (request.require_review) {
        const bool ok = std::any_of(evidence.begin(), evidence.end(), [](const EvidenceArtifact& artifact) {
            return artifact.kind == EvidenceKind::Review || artifact.kind == EvidenceKind::Approval;
        });
        if (ok) result.satisfied_rules.push_back("rule.review.present");
        else result.violations.push_back("review evidence missing");
    }

    if (request.require_build) {
        const bool ok = std::any_of(evidence.begin(), evidence.end(), [](const EvidenceArtifact& artifact) {
            return artifact.kind == EvidenceKind::BuildResult;
        });
        if (ok) result.satisfied_rules.push_back("rule.build.present");
        else result.violations.push_back("build evidence missing");
    }

    for (const auto& artifact : evidence) {
        result.evidence_ids.push_back(artifact.id);
    }

    result.status = result.violations.empty() ? VerificationStatus::Passed : VerificationStatus::Failed;
    result.summary = build_summary(result);
    result.completed_at = Clock::now();

    {
        std::scoped_lock lock(mutex_);
        results_.push_back(result);
    }
    emit(result.status == VerificationStatus::Passed ? VerificationEventKind::VerificationPassed : VerificationEventKind::VerificationFailed,
         request.session_id,
         result.summary);
    refresh_metrics(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - started));
    return result;
}

std::optional<VerificationResult> VerificationEngine::latest_result(std::string_view session_id) const {
    std::scoped_lock lock(mutex_);
    for (auto it = results_.rbegin(); it != results_.rend(); ++it) {
        if (it->session_id == session_id) {
            return *it;
        }
    }
    return std::nullopt;
}

VerificationSnapshot VerificationEngine::snapshot() const {
    std::scoped_lock lock(mutex_);
    return {requests_, results_, evidence_store_.list(), events_.history(), verification_metrics_};
}

VerificationEngineApi VerificationEngine::api() const {
    return VerificationEngineApi{&requests_, &results_, evidence_store_, &verification_metrics_};
}

VerificationRequest VerificationEngine::require_request(std::string_view request_id) const {
    std::scoped_lock lock(mutex_);
    const auto it = std::find_if(requests_.begin(), requests_.end(), [&](const VerificationRequest& request) {
        return request.id == request_id;
    });
    if (it == requests_.end()) {
        throw OperatorError(ErrorCode::LifecycleFailure, "verification request not found");
    }
    return *it;
}

std::string VerificationEngine::build_summary(const VerificationResult& result) {
    std::ostringstream out;
    out << to_string(result.status) << " with "
        << result.satisfied_rules.size() << " satisfied rule(s)";
    if (!result.violations.empty()) {
        out << " and " << result.violations.size() << " violation(s)";
    }
    return out.str();
}

void VerificationEngine::emit(VerificationEventKind kind, std::string session_id, std::string payload) {
    events_.emit({next_verification_id(), kind, std::move(session_id), std::move(payload), Clock::now()});
}

void VerificationEngine::refresh_metrics(std::chrono::milliseconds duration) {
    VerificationMetrics refreshed;
    {
        std::scoped_lock lock(mutex_);
        refreshed.total_requests = requests_.size();
        refreshed.evidence_artifacts = evidence_store_.list().size();
        for (const auto& result : results_) {
            if (result.status == VerificationStatus::Passed) {
                ++refreshed.passed;
            } else if (result.status == VerificationStatus::Failed) {
                ++refreshed.failed;
            } else if (result.status == VerificationStatus::Rejected) {
                ++refreshed.rejected;
            }
        }
        if (!results_.empty() && duration.count() > 0) {
            if (verification_metrics_.average_duration.count() == 0) {
                refreshed.average_duration = duration;
            } else {
                const auto prior = verification_metrics_.average_duration.count() * static_cast<long long>(results_.size() - 1);
                refreshed.average_duration = std::chrono::milliseconds((prior + duration.count()) / static_cast<long long>(results_.size()));
            }
        } else {
            refreshed.average_duration = verification_metrics_.average_duration;
        }
        verification_metrics_ = refreshed;
    }
    metrics_.record_build_statistic("verification_requests", static_cast<double>(refreshed.total_requests));
    metrics_.record_build_statistic("evidence_artifacts", static_cast<double>(refreshed.evidence_artifacts));
}

} // namespace exotic::codex_operator
