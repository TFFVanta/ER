#include "lifecycle.hpp"
#include <algorithm>
namespace exotic::runtime {
void LifecycleManager::add(std::shared_ptr<RuntimeService>s){std::scoped_lock l{mutex_};if(running_)throw ServiceError("cannot add service while runtime is running");graph_.add(std::move(s));}
void LifecycleManager::recover_all(){std::scoped_lock l{mutex_};order_=graph_.ordered();for(auto&s:order_)s->recover();}
void LifecycleManager::start_all(){std::scoped_lock l{mutex_};if(running_)return;if(order_.empty())order_=graph_.ordered();started_.clear();try{for(auto&s:order_){s->start();started_.push_back(s);}running_=true;}catch(...){for(auto it=started_.rbegin();it!=started_.rend();++it){try{(*it)->request_stop();}catch(...){}}for(auto it=started_.rbegin();it!=started_.rend();++it){try{(*it)->join();}catch(...){}}started_.clear();throw;}}
void LifecycleManager::request_stop(){std::scoped_lock l{mutex_};for(auto it=started_.rbegin();it!=started_.rend();++it)(*it)->request_stop();}
void LifecycleManager::join(){std::scoped_lock l{mutex_};for(auto it=started_.rbegin();it!=started_.rend();++it)(*it)->join();running_=false;started_.clear();}
void LifecycleManager::shutdown(){request_stop();join();}
std::vector<ServiceHealth> LifecycleManager::health(){std::scoped_lock l{mutex_};std::vector<ServiceHealth> r;for(auto&s:graph_.ordered())r.push_back(s->health());return r;}
bool LifecycleManager::running()const noexcept{std::scoped_lock l{mutex_};return running_;}
}
