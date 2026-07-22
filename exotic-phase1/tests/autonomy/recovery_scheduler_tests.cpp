#include "exotic/autonomy/scheduler/scheduler.hpp"
#include "exotic/autonomy/scheduler/sqlite_repository.hpp"
#include <cassert>
#include <filesystem>
using namespace exotic::autonomy::scheduler;
class NoopBridge final:public ExecutionBridge{public:ExecutionResult execute(const Job&,std::stop_token)override{return {true,FailureClass::Permanent,"ok"};}};
int main(){auto p=std::filesystem::temp_directory_path()/"exotic-scheduler-recovery.db";std::filesystem::remove(p);{SqliteSchedulerRepository repo{p};NoopBridge b;BasicConditionEvaluator c;DurableScheduler s{repo,b,c};Job j;j.id=repo.next_job_id();j.objective_id=1;j.proposal_id=1;j.name="leased";j.idempotency_key="leased";j.status=JobStatus::Running;j.next_run_at=Clock::now();repo.upsert_job(j);Lease l;l.id=repo.next_lease_id();l.job_id=j.id;l.worker_id="dead-worker";l.acquired_at=l.heartbeat_at=Clock::now()-std::chrono::minutes{2};l.expires_at=Clock::now()-std::chrono::minutes{1};assert(repo.try_acquire_lease(l));s.recover();auto r=repo.find_job(j.id);assert(r&&r->status==JobStatus::WaitingRetry);}std::filesystem::remove(p);std::filesystem::remove(p.string()+"-wal");std::filesystem::remove(p.string()+"-shm");}
