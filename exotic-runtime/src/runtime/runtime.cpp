#include "exotic/runtime/runtime.hpp"
#include <sstream>
#include <stdexcept>

namespace exotic {
Runtime::Runtime()
    : memory_(4096), observer_(graph_, events_), prediction_(memory_), execution_(graph_, events_), learning_(memory_) {}
CycleResult Runtime::cycle(Id actor, Id subject, std::string signal, double value, Action action) {
    if (!security_.allowed(actor, Permission::Execute)) throw std::runtime_error("security: actor lacks Execute permission");
    auto observation = observer_.observe(subject, std::move(signal), value);
    auto prediction = prediction_.predict(observation);
    auto alignment = alignment_.evaluate(subject, graph_, prediction);
    action.subject = subject;
    const bool executed = execution_.execute(action, alignment);
    learning_.learn(observation, prediction, executed);
    return {observation, prediction, alignment, executed};
}
std::string Runtime::status() const {
    std::ostringstream out;
    out << "Exotic Runtime v0.1.0\n"
        << "entities=" << graph_.entity_count() << "\n"
        << "relationships=" << graph_.relationship_count() << "\n"
        << "memories=" << memory_.size() << "\n"
        << "loop=Observe->Map->Predict->Align->Act->Measure->Learn";
    return out.str();
}
}
