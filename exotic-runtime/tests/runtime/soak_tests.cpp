#include "exotic/autonomy/scheduler/sqlite_repository.hpp"
#include "exotic/autonomy/scheduler/scheduler.hpp"
#include <atomic>
#include <cassert>
#include <thread>
namespace {class Bridge final:public exotic::autonomy::scheduler::ExecutionBridge{public:std::atomic<int>calls{0};exotic::autonomy::scheduler::ExecutionResult execute(const exotic::autonomy::scheduler::Job&,std::stop_token)override{++calls;return{true,exotic::autonomy::scheduler::FailureClass::Permanent,"ok"};}};}
int main(){using namespace exotic::autonomy::scheduler;auto p=std::filesystem::temp_directory_path()/"exotic-runtime-soak.db";std::filesystem::remove(p);
std::filesystem::remove(p.string()+"-wal");std::filesystem::remove(p.string()+"-shm");{SqliteSchedulerRepository repo{p};Bridge bridge;BasicConditionEvaluator conditions;DurableScheduler scheduler{repo,bridge,conditions,SchedulerLimits{8,std::chrono::seconds(5),std::chrono::milliseconds(100),std::chrono::milliseconds(5),std::chrono::seconds(5)}};scheduler.recover();scheduler.start(4);constexpr int count=100;for(int i=0;i<count;++i){Job j;j.objective_id=1;j.proposal_id=i+1;j.name="soak";j.idempotency_key="soak-"+std::to_string(i);j.concurrency.max_running=8;scheduler.submit(j);}for(int i=0;i<400&&scheduler.stats().completed<count;++i)std::this_thread::sleep_for(std::chrono::milliseconds(10));scheduler.request_stop();scheduler.join();auto s=scheduler.stats();assert(s.completed==count&&s.active_leases==0&&bridge.calls==count);}std::filesystem::remove(p);std::filesystem::remove(p.string()+"-wal");std::filesystem::remove(p.string()+"-shm");}
