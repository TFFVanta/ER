#include "exotic/autonomy/scheduler/scheduler.hpp"
#include "exotic/autonomy/scheduler/sqlite_repository.hpp"
#include <cassert>
#include <filesystem>
#include <thread>

using namespace exotic::autonomy::scheduler;
class SuccessBridge final:public ExecutionBridge{public:ExecutionResult execute(const Job&,std::stop_token)override{return {true,FailureClass::Permanent,"ok"};}};
int main(){auto path=std::filesystem::temp_directory_path()/"exotic-scheduler-test.db";std::filesystem::remove(path);SqliteSchedulerRepository repo{path};SuccessBridge bridge;BasicConditionEvaluator conditions;SchedulerLimits limits;limits.poll_interval=std::chrono::milliseconds{10};DurableScheduler scheduler{repo,bridge,conditions,limits};Job j;j.objective_id=1;j.proposal_id=1;j.name="test";j.idempotency_key="test-once";auto id=scheduler.submit(j);assert(scheduler.submit(j)==id);scheduler.tick_once("test-worker");auto loaded=repo.find_job(id);assert(loaded&&loaded->status==JobStatus::Completed);std::filesystem::remove(path);}
