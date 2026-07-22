#pragma once
#include "service.hpp"
#include "config.hpp"
#include "../autonomy/scheduler/scheduler.hpp"
#include "../autonomy/governance/service.hpp"
#include "../autonomy/governance/repository.hpp"
#include "../autonomy/resources/governor.hpp"
#include "../autonomy/resources/recovery.hpp"
#include "../autonomy/agents/registry.hpp"
#include "../autonomy/agents/recovery.hpp"
#include <atomic>
#include <functional>
#include <thread>
namespace exotic::runtime {
class CallbackService final:public RuntimeService{public:using Fn=std::function<void()>;using Health=std::function<ServiceHealth()>;CallbackService(std::string,std::vector<std::string>,Fn recover,Fn start,Fn stop,Fn join,Health health);std::string name()const override;std::vector<std::string>dependencies()const override;void recover()override;void start()override;void request_stop()override;void join()override;ServiceHealth health()override;private:std::string name_;std::vector<std::string>deps_;Fn recover_,start_,stop_,join_;Health health_;};
class SchedulerService final:public RuntimeService{public:SchedulerService(autonomy::scheduler::DurableScheduler&,std::size_t workers,std::string prefix="exotic-worker");std::string name()const override{return"scheduler";}std::vector<std::string>dependencies()const override{return{"autonomy","governance","resources","agents"};}void recover()override;void start()override;void request_stop()override;void join()override;ServiceHealth health()override;private:autonomy::scheduler::DurableScheduler&s_;std::size_t workers_;std::string prefix_;std::atomic<bool>running_{false};};
class GovernanceService final:public RuntimeService{public:GovernanceService(autonomy::governance::GovernanceService&,autonomy::governance::GovernanceRepository&);std::string name()const override{return"governance";}std::vector<std::string>dependencies()const override{return{"autonomy"};}void recover()override;void start()override;void request_stop()override;void join()override;ServiceHealth health()override;private:autonomy::governance::GovernanceService&service_;autonomy::governance::GovernanceRepository&repo_;std::atomic<bool>running_{false};};
class ResourceService final:public RuntimeService{public:ResourceService(autonomy::resources::ResourceGovernor&,autonomy::resources::ResourceRecoveryManager&);std::string name()const override{return"resources";}std::vector<std::string>dependencies()const override{return{"governance"};}void recover()override;void start()override;void request_stop()override;void join()override;ServiceHealth health()override;private:autonomy::resources::ResourceGovernor&governor_;autonomy::resources::ResourceRecoveryManager&recovery_;std::atomic<bool>running_{false};std::size_t recovered_{0};};
class AgentService final:public RuntimeService{public:AgentService(autonomy::agents::AgentRegistry&,autonomy::agents::AgentRecoveryManager&);std::string name()const override{return"agents";}std::vector<std::string>dependencies()const override{return{"governance","resources"};}void recover()override;void start()override;void request_stop()override;void join()override;ServiceHealth health()override;private:autonomy::agents::AgentRegistry&registry_;autonomy::agents::AgentRecoveryManager&recovery_;std::atomic<bool>running_{false};std::size_t recovered_{0};};
class AgentHeartbeatService final:public RuntimeService{public:AgentHeartbeatService(autonomy::agents::AgentRegistry&,autonomy::agents::AgentId,std::chrono::milliseconds);std::string name()const override{return"agent-heartbeat";}std::vector<std::string>dependencies()const override{return{"agents"};}void recover()override{}void start()override;void request_stop()override;void join()override;ServiceHealth health()override;private:autonomy::agents::AgentRegistry&registry_;autonomy::agents::AgentId id_;std::chrono::milliseconds interval_;std::jthread thread_;std::atomic<bool>running_{false};};
}
