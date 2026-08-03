#include "exotic/engines/engines.hpp"
#include <algorithm>
#include <cmath>

namespace exotic {
Observation ObserverEngine::observe(Id subject, std::string signal, double value) {
    if (auto entity = graph_.entity(subject)) entity->set("observed." + signal, value);
    Observation obs{subject, std::move(signal), value};
    bus_.publish(Event{Id::New(), "observation.created", subject, subject, {{"signal", obs.signal}, {"value", value}}});
    return obs;
}
Prediction PredictionEngine::predict(const Observation& observation) const {
    const auto history = memory_.recall("observation:" + observation.signal, 8);
    double weighted = observation.value; double weight = 1.0;
    for (const auto& record : history) if (const auto n = record.content.number()) { weighted += *n * record.importance; weight += record.importance; }
    const double estimate = weighted / weight;
    const double confidence = std::clamp(0.25 + static_cast<double>(history.size()) * 0.1, 0.25, 0.95);
    return {observation.subject, observation.signal, estimate, confidence};
}
AlignmentState AlignmentEngine::evaluate(Id subject, const StateGraph& graph, const Prediction& prediction) const {
    const auto degree = static_cast<double>(graph.neighbors(subject).size());
    const double structure = std::clamp(0.45 + degree * 0.08, 0.0, 1.0);
    const double balance = std::clamp(1.0 - std::abs(prediction.estimate) * 0.05, 0.0, 1.0);
    const double motion = std::clamp(std::abs(prediction.estimate) * 0.1, 0.0, 1.0);
    const double timing = prediction.confidence;
    const double focus = std::clamp((structure + timing) / 2.0, 0.0, 1.0);
    const double adaptability = std::clamp(0.5 + motion * 0.5, 0.0, 1.0);
    const double overall = (structure + balance + motion + timing + focus + adaptability) / 6.0;
    return {structure, balance, motion, timing, focus, adaptability, overall};
}
Relationship RelationshipEngine::relate(Id from, Id to, std::string type, double weight) { return graph_.connect(from, to, std::move(type), weight); }
bool ExecutionEngine::execute(const Action& action, const AlignmentState& alignment) {
    if (alignment.overall < 0.45) return false;
    auto entity = graph_.entity(action.subject); if (!entity) return false;
    entity->set("action.last", action.command); entity->set("action.parameter", action.parameter);
    bus_.publish(Event{Id::New(), "action.executed", action.subject, action.subject, {{"command", action.command}, {"alignment", alignment.overall}}});
    return true;
}
void LearningEngine::learn(const Observation& observation, const Prediction& prediction, bool success) {
    memory_.remember("observation:" + observation.signal, observation.value, success ? 0.8 : 0.35);
    memory_.remember("prediction:" + prediction.variable, prediction.estimate, prediction.confidence);
}
double PerceptionEngine::coherence(double physical, double neural, double meaning) {
    physical = std::clamp(physical, 0.0, 1.0); neural = std::clamp(neural, 0.0, 1.0); meaning = std::clamp(meaning, 0.0, 1.0);
    return std::cbrt(std::max(0.0, physical * neural * meaning));
}
}
