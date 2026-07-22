#include "exotic/services/services.hpp"
#include "exotic/core/id.hpp"
#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <fstream>
#include <sstream>
#include <stdexcept>

namespace exotic {
namespace {
std::string uid(){ return Id::New().str(); }
void transition(ServiceHealth& h, ServiceState s, std::string d){ h.state=s; h.healthy=s!=ServiceState::Failed; h.detail=std::move(d); }
std::string lower(std::string s){ std::transform(s.begin(),s.end(),s.begin(),[](unsigned char c){return static_cast<char>(std::tolower(c));}); return s; }
}
void ServiceRegistry::add(std::shared_ptr<IService> s){ if(!s) throw std::invalid_argument("null service"); if(!services_.emplace(s->name(),s).second) throw std::runtime_error("duplicate service: "+s->name()); }
void ServiceRegistry::initialize_all(){ for(auto& [_,s]:services_) s->initialize(); }
void ServiceRegistry::start_all(){ for(auto& [_,s]:services_) s->start(); }
void ServiceRegistry::stop_all() noexcept { for(auto it=services_.rbegin();it!=services_.rend();++it) it->second->stop(); }
std::shared_ptr<IService> ServiceRegistry::get(const std::string& n) const { auto it=services_.find(n); return it==services_.end()?nullptr:it->second; }
std::vector<std::pair<std::string,ServiceHealth>> ServiceRegistry::health() const { std::vector<std::pair<std::string,ServiceHealth>> out; for(auto& [n,s]:services_) out.push_back({n,s->health()}); return out; }

SearchService::SearchService(PlatformService& p):platform_(p){}
void SearchService::initialize(){ std::scoped_lock l(mutex_); transition(health_,ServiceState::Initialized,"ready"); }
void SearchService::start(){ std::scoped_lock l(mutex_); transition(health_,ServiceState::Running,"index-on-demand"); }
void SearchService::stop() noexcept { std::scoped_lock l(mutex_); transition(health_,ServiceState::Stopped,"stopped"); }
ServiceHealth SearchService::health() const { std::scoped_lock l(mutex_); return health_; }
std::vector<SearchHit> SearchService::search(const std::string& query,std::size_t limit){ std::vector<SearchHit> hits; if(query.empty()) return hits; const auto q=lower(query); for(const auto& p:platform_.projects()){ std::error_code ec; for(std::filesystem::recursive_directory_iterator it(p.path,std::filesystem::directory_options::skip_permission_denied,ec),end;it!=end && hits.size()<limit;it.increment(ec)){ if(ec){ec.clear();continue;} if(!it->is_regular_file(ec)||it->file_size(ec)>262144) continue; auto rel=std::filesystem::relative(it->path(),p.path,ec); auto content=platform_.read_text_file(p.id,rel); if(!content) continue; std::istringstream in(*content); std::string line; std::size_t n=0; while(std::getline(in,line)&&hits.size()<limit){++n;if(lower(line).find(q)!=std::string::npos) hits.push_back({p.id,rel.generic_string(),n,line.substr(0,240)});} }} std::scoped_lock l(mutex_); ++health_.operations; return hits; }

BuildService::BuildService(PlatformService& p,EventBus& e):platform_(p),events_(e){}
void BuildService::initialize(){ std::scoped_lock l(mutex_); transition(health_,ServiceState::Initialized,"profiles loaded"); register_profile({"cmake-debug","CMake Debug",{"cmake","--build","out/build/x64-Debug","--config","Debug"}}); register_profile({"ctest-debug","CTest Debug",{"ctest","--test-dir","out/build/x64-Debug","-C","Debug","--output-on-failure"}}); }
void BuildService::start(){ std::scoped_lock l(mutex_); transition(health_,ServiceState::Running,"queue ready"); }
void BuildService::stop() noexcept { std::scoped_lock l(mutex_); transition(health_,ServiceState::Stopped,"stopped"); }
ServiceHealth BuildService::health() const { std::scoped_lock l(mutex_); return health_; }
void BuildService::register_profile(BuildProfile p){ if(p.id.empty()||p.command.empty()) throw std::invalid_argument("invalid build profile"); for(auto& t:p.command) if(!safe_token(t)) throw std::invalid_argument("unsafe build token"); profiles_[p.id]=std::move(p); }
std::vector<BuildProfile> BuildService::profiles() const { std::scoped_lock l(mutex_); std::vector<BuildProfile> out; for(auto& [_,p]:profiles_) out.push_back(p); return out; }
std::string BuildService::queue(const std::string& project,const std::string& profile){ std::scoped_lock l(mutex_); if(!platform_.project(project)) throw std::runtime_error("unknown project"); if(!profiles_.contains(profile)) throw std::runtime_error("unknown profile"); jobs_.push_back({uid(),project,profile,JobState::Queued,-1,"",std::chrono::system_clock::now()}); pending_.push(jobs_.size()-1); ++health_.operations; return jobs_.back().id; }
bool BuildService::safe_token(const std::string& t){ return !t.empty() && t.find_first_of(";&|><`\n\r") == std::string::npos; }
bool BuildService::run_next(){ std::size_t index; BuildProfile profile; ProjectInfo project; {std::scoped_lock l(mutex_); if(pending_.empty()) return false; index=pending_.front(); pending_.pop(); auto& j=jobs_[index]; j.state=JobState::Running; profile=profiles_.at(j.profile_id); project=*platform_.project(j.project_id);} std::ostringstream cmd; cmd << "cd \"" << project.path.string() << "\" && "; for(std::size_t i=0;i<profile.command.size();++i){ if(i)cmd<<' ';cmd<<'\"'<<profile.command[i]<<'\"'; } cmd << " > exotic-build.log 2>&1"; const int code=std::system(cmd.str().c_str()); std::ifstream log(project.path/"exotic-build.log",std::ios::binary); std::ostringstream text; text<<log.rdbuf(); {std::scoped_lock l(mutex_); auto& j=jobs_[index];j.exit_code=code;j.log=text.str().substr(0,262144);j.state=code==0?JobState::Succeeded:JobState::Failed; ++health_.operations;} events_.publish(Event{Id::New(),"build.completed",{}, {}, {}, std::chrono::system_clock::now()}); return true; }
std::vector<BuildJob> BuildService::jobs(std::size_t limit) const { std::scoped_lock l(mutex_); auto n=std::min(limit,jobs_.size()); return std::vector<BuildJob>(jobs_.end()-static_cast<std::ptrdiff_t>(n),jobs_.end()); }

void NotificationService::initialize(){std::scoped_lock l(mutex_);transition(health_,ServiceState::Initialized,"ready");} void NotificationService::start(){std::scoped_lock l(mutex_);transition(health_,ServiceState::Running,"ready");} void NotificationService::stop() noexcept{std::scoped_lock l(mutex_);transition(health_,ServiceState::Stopped,"stopped");} ServiceHealth NotificationService::health()const{std::scoped_lock l(mutex_);return health_;}
std::string NotificationService::push(std::string level,std::string title,std::string message){std::scoped_lock l(mutex_);items_.push_back({uid(),std::move(level),std::move(title),std::move(message),false,std::chrono::system_clock::now()});++health_.operations;return items_.back().id;}
std::vector<Notification> NotificationService::list(std::size_t limit)const{std::scoped_lock l(mutex_);auto n=std::min(limit,items_.size());return {items_.end()-static_cast<std::ptrdiff_t>(n),items_.end()};} bool NotificationService::mark_read(const std::string&id){std::scoped_lock l(mutex_);for(auto&x:items_)if(x.id==id){x.read=true;return true;}return false;}

void DeviceService::initialize(){std::scoped_lock l(mutex_);transition(health_,ServiceState::Initialized,"ready");} void DeviceService::start(){std::scoped_lock l(mutex_);transition(health_,ServiceState::Running,"ready");} void DeviceService::stop() noexcept{std::scoped_lock l(mutex_);transition(health_,ServiceState::Stopped,"stopped");} ServiceHealth DeviceService::health()const{std::scoped_lock l(mutex_);return health_;}
std::string DeviceService::register_device(std::string name,std::string kind,std::string fp){std::scoped_lock l(mutex_);for(auto&d:devices_)if(d.fingerprint==fp){d.last_seen=std::chrono::system_clock::now();return d.id;}devices_.push_back({uid(),std::move(name),std::move(kind),std::move(fp),false,std::chrono::system_clock::now()});++health_.operations;return devices_.back().id;}
bool DeviceService::approve(const std::string&id){std::scoped_lock l(mutex_);for(auto&d:devices_)if(d.id==id){d.approved=true;return true;}return false;} bool DeviceService::revoke(const std::string&id){std::scoped_lock l(mutex_);for(auto&d:devices_)if(d.id==id){d.approved=false;return true;}return false;} std::vector<DeviceIdentity> DeviceService::devices()const{std::scoped_lock l(mutex_);return devices_;}

void AIService::initialize(){std::scoped_lock l(mutex_);transition(health_,ServiceState::Initialized,"proposal mode");} void AIService::start(){std::scoped_lock l(mutex_);transition(health_,ServiceState::Running,"approval required");} void AIService::stop() noexcept{std::scoped_lock l(mutex_);transition(health_,ServiceState::Stopped,"stopped");} ServiceHealth AIService::health()const{std::scoped_lock l(mutex_);return health_;}
std::string AIService::propose(std::string t,std::string r,std::string c){std::scoped_lock l(mutex_);proposals_.push_back({uid(),std::move(t),std::move(r),std::move(c),ProposalState::Proposed});++health_.operations;return proposals_.back().id;} bool AIService::decide(const std::string&id,bool yes){std::scoped_lock l(mutex_);for(auto&p:proposals_)if(p.id==id&&p.state==ProposalState::Proposed){p.state=yes?ProposalState::Approved:ProposalState::Rejected;return true;}return false;} std::vector<AIProposal> AIService::proposals()const{std::scoped_lock l(mutex_);return proposals_;}

AutomationService::AutomationService(EventBus&e):events_(e){} void AutomationService::initialize(){std::scoped_lock l(mutex_);transition(health_,ServiceState::Initialized,"ready");} void AutomationService::start(){std::scoped_lock l(mutex_);transition(health_,ServiceState::Running,"ready");} void AutomationService::stop() noexcept{std::scoped_lock l(mutex_);transition(health_,ServiceState::Stopped,"stopped");} ServiceHealth AutomationService::health()const{std::scoped_lock l(mutex_);return health_;}
std::string AutomationService::run(std::string name,std::vector<WorkflowStep> steps){WorkflowRun run{uid(),std::move(name),JobState::Running,0,"running"};{std::scoped_lock l(mutex_);runs_.push_back(run);} bool ok=true;for(auto&s:steps){try{if(!s.action()){ok=false;run.detail="failed: "+s.name;break;}++run.completed_steps;}catch(const std::exception&e){ok=false;run.detail=e.what();break;}}run.state=ok?JobState::Succeeded:JobState::Failed;if(ok)run.detail="complete";{std::scoped_lock l(mutex_);for(auto&r:runs_)if(r.id==run.id){r=run;break;}++health_.operations;}events_.publish(Event{Id::New(),"automation.completed",{}, {}, {}, std::chrono::system_clock::now()});return run.id;} std::vector<WorkflowRun> AutomationService::runs()const{std::scoped_lock l(mutex_);return runs_;}
}
