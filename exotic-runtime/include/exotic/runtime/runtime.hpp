#pragma once
#include "exotic/engines/engines.hpp"
#include "exotic/security/security.hpp"
#include <string>

namespace exotic {
struct CycleResult { Observation observation; Prediction prediction; AlignmentState alignment; bool executed{false}; };
class Runtime {
public:
    Runtime();
    [[nodiscard]] StateGraph& graph() noexcept { return graph_; }
    [[nodiscard]] MemoryStore& memory() noexcept { return memory_; }
    [[nodiscard]] EventBus& events() noexcept { return events_; }
    [[nodiscard]] SecurityLayer& security() noexcept { return security_; }
    CycleResult cycle(Id actor, Id subject, std::string signal, double value, Action action);
    [[nodiscard]] std::string status() const;
private:
    StateGraph graph_; EventBus events_; MemoryStore memory_; SecurityLayer security_;
    ObserverEngine observer_; PredictionEngine prediction_; AlignmentEngine alignment_;
    ExecutionEngine execution_; LearningEngine learning_;
};
}
