#include "cli.hpp"
#include <iostream>

namespace exotic::autonomy::scheduler {
int run_scheduler_cli(SchedulerRepository& r,std::span<const std::string_view> a){
 if(a.empty()||a[0]=="status"){auto s=r.stats();std::cout<<"EXOTIC EVENT SCHEDULER 0.3\n"<<"pending="<<s.pending<<"\nready="<<s.ready<<"\nleased="<<s.leased<<"\nrunning="<<s.running<<"\nwaiting_retry="<<s.waiting_retry<<"\nblocked="<<s.blocked<<"\ncompleted="<<s.completed<<"\ndead_lettered="<<s.dead_lettered<<"\nactive_leases="<<s.active_leases<<'\n';return 0;}
 if(a[0]=="jobs"){for(const auto& j:r.load_jobs())std::cout<<j.id<<' '<<to_string(j.status)<<' '<<static_cast<int>(j.priority)<<' '<<j.name<<'\n';return 0;}
 if(a[0]=="dead-letters"){for(const auto& d:r.load_dead_letters(100))std::cout<<d.id<<" job="<<d.job_id<<' '<<to_string(d.failure_class)<<' '<<d.reason<<'\n';return 0;}
 std::cerr<<"usage: exotic scheduler [status|jobs|dead-letters]\n";return 2;
}
}
