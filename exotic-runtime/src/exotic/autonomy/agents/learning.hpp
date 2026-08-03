#pragma once
#include "registry.hpp"
namespace exotic::autonomy::agents {
struct LearningConfig{double reliability_learning_rate{0.15};double proficiency_learning_rate{0.05};double success_target{1.0};double failure_target{0.0};};
class AgentLearningEngine{
public:AgentLearningEngine(AgentRepository&,LearningConfig={});
void record(PerformanceRecord record);
void record_assignment(const WorkAssignment&,PerformanceOutcome,double quality,double verification,std::chrono::milliseconds duration,double actual_cost,std::string reason);
private:AgentRepository& repository_;LearningConfig config_;void update_capability(AgentId,std::string_view,PerformanceOutcome,double quality);
};
}
