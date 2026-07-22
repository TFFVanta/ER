#include "config.hpp"
#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <fstream>
#include <stdexcept>
#include <unordered_map>

namespace exotic::runtime {
namespace {
std::string trim(std::string s){auto not_space=[](unsigned char c){return !std::isspace(c);};s.erase(s.begin(),std::find_if(s.begin(),s.end(),not_space));s.erase(std::find_if(s.rbegin(),s.rend(),not_space).base(),s.end());return s;}
std::unordered_map<std::string,std::string> parse(const std::filesystem::path&p){std::unordered_map<std::string,std::string> out;std::ifstream in(p);if(!in)return out;std::string line;while(std::getline(in,line)){line=trim(line);if(line.empty()||line[0]=='#'||line[0]==';'||line[0]=='[')continue;auto pos=line.find('=');if(pos==std::string::npos)continue;auto key=trim(line.substr(0,pos));auto value=trim(line.substr(pos+1));if(value.size()>=2&&value.front()=='"'&&value.back()=='"')value=value.substr(1,value.size()-2);out[key]=value;}return out;}
bool truth(std::string_view v){return v=="1"||v=="true"||v=="yes"||v=="on";}
std::optional<std::string> read_env(const char* key){
#ifdef _WIN32
char* value=nullptr;std::size_t size=0;if(_dupenv_s(&value,&size,key)!=0||value==nullptr)return std::nullopt;std::string out{value};std::free(value);return out;
#else
if(const char* value=std::getenv(key))return std::string{value};return std::nullopt;
#endif
}
}
void RuntimeConfig::validate()const{if(workspace.empty())throw std::invalid_argument("runtime workspace is empty");if(scheduler_workers==0)throw std::invalid_argument("scheduler_workers must be positive");if(health_interval.count()<=0||control_interval.count()<=0)throw std::invalid_argument("runtime intervals must be positive");if(default_concurrency==0)throw std::invalid_argument("default_concurrency must be positive");}
RuntimeConfig load_runtime_config(const std::filesystem::path& workspace,const std::optional<std::filesystem::path>& file){RuntimeConfig c;c.workspace=std::filesystem::absolute(workspace);c.workspace_id=c.workspace.filename().string();if(c.workspace_id.empty())c.workspace_id="workspace";const auto path=file.value_or(c.workspace/".exotic"/"runtime.conf");auto m=parse(path);auto get=[&](const char*k)->std::optional<std::string>{auto it=m.find(k);return it==m.end()?std::nullopt:std::optional<std::string>{it->second};};if(auto v=get("runtime.mode")){auto mode=runtime_mode_from_string(*v);if(!mode)throw std::invalid_argument("invalid runtime.mode");c.mode=*mode;}if(auto v=get("runtime.workspace_id"))c.workspace_id=*v;if(auto v=get("scheduler.workers"))c.scheduler_workers=std::stoul(*v);if(auto v=get("health.interval_ms"))c.health_interval=std::chrono::milliseconds{std::stoll(*v)};if(auto v=get("control.interval_ms"))c.control_interval=std::chrono::milliseconds{std::stoll(*v)};if(auto v=get("agents.heartbeat_interval_ms"))c.agent_heartbeat_interval=std::chrono::milliseconds{std::stoll(*v)};if(auto v=get("runtime.shutdown_grace_ms"))c.shutdown_grace=std::chrono::milliseconds{std::stoll(*v)};if(auto v=get("runtime.seed_simulation_identity"))c.seed_simulation_identity=truth(*v);if(auto v=get("dashboard.enabled"))c.write_dashboard=truth(*v);if(auto v=get("runtime.simulation_execute_internal"))c.simulation_execute_internal=truth(*v);if(auto v=get("governance.default_approval_id"))c.default_governance_approval_id=static_cast<std::uint64_t>(std::stoull(*v));if(auto v=get("budget.money_usd"))c.default_money_limit_usd=std::stod(*v);if(auto v=get("budget.api_credits"))c.default_api_credit_limit=std::stod(*v);if(auto v=get("budget.cpu_ms"))c.default_cpu_milliseconds=std::stod(*v);if(auto v=get("budget.concurrency"))c.default_concurrency=static_cast<std::uint32_t>(std::stoul(*v));if(auto v=get("budget.default_job_usd"))c.default_job_budget_usd=std::stod(*v);
if(auto e=read_env("EXOTIC_SIMULATION")){if(truth(*e))c.mode=RuntimeMode::Simulation;}
if(auto e=read_env("EXOTIC_WORKERS")){c.scheduler_workers=std::stoul(*e);}
c.validate();return c;}
}
