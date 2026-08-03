#include "exotic/runtime/lifecycle.hpp"
#include "test_service.hpp"
#include <cassert>
#include <algorithm>
int main(){using namespace exotic::runtime;std::vector<std::string>e;LifecycleManager l;l.add(std::make_shared<test::Service>("a",std::vector<std::string>{},e));l.add(std::make_shared<test::Service>("b",std::vector<std::string>{"a"},e));l.recover_all();l.start_all();assert(l.running());l.shutdown();assert(!l.running());assert(std::find(e.begin(),e.end(),"start:a")<std::find(e.begin(),e.end(),"start:b"));assert(std::find(e.begin(),e.end(),"stop:b")<std::find(e.begin(),e.end(),"stop:a"));std::vector<std::string>f;LifecycleManager bad;bad.add(std::make_shared<test::Service>("a",std::vector<std::string>{},f));bad.add(std::make_shared<test::Service>("b",std::vector<std::string>{"a"},f,true));bad.recover_all();bool threw=false;try{bad.start_all();}catch(...){threw=true;}assert(threw&&!bad.running());}
