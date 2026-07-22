#pragma once
#include "exotic/core/event_bus.hpp"
#include "exotic/core/graph.hpp"
#include "exotic/core/memory.hpp"
#include <string>
#include <vector>

namespace exotic {
struct Observation { Id subject{}; std::string signal; double value{0.0}; };
struct Prediction { Id subject{}; std::string variable; double estimate{0.0}; double confidence{0.0}; };
struct AlignmentState { double structure{}, balance{}, motion{}, timing{}, focus{}, adaptability{}, overall{}; };
struct Action { Id subject{}; std::string command; Value parameter; double priority{0.5}; };

class ObserverEngine {
public: ObserverEngine(StateGraph& graph, EventBus& bus) : graph_(graph), bus_(bus) {}
    Observation observe(Id subject, std::string signal, double value);
private: StateGraph& graph_; EventBus& bus_;
};
class PredictionEngine {
public: explicit PredictionEngine(MemoryStore& memory) : memory_(memory) {}
    Prediction predict(const Observation& observation) const;
private: MemoryStore& memory_;
};
class AlignmentEngine {
public: AlignmentState evaluate(Id subject, const StateGraph& graph, const Prediction& prediction) const;
};
class RelationshipEngine {
public: explicit RelationshipEngine(StateGraph& graph) : graph_(graph) {}
    Relationship relate(Id from, Id to, std::string type, double weight);
private: StateGraph& graph_;
};
class ExecutionEngine {
public: ExecutionEngine(StateGraph& graph, EventBus& bus) : graph_(graph), bus_(bus) {}
    bool execute(const Action& action, const AlignmentState& alignment);
private: StateGraph& graph_; EventBus& bus_;
};
class LearningEngine {
public: explicit LearningEngine(MemoryStore& memory) : memory_(memory) {}
    void learn(const Observation& observation, const Prediction& prediction, bool success);
private: MemoryStore& memory_;
};
class PerceptionEngine {
public: static double coherence(double physical, double neural, double meaning);
};
}
