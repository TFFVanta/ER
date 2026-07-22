#include "exotic/runtime/service_graph.hpp"
#include "test_service.hpp"
#include <cassert>
int main(){using namespace exotic::runtime;std::vector<std::string>e;ServiceGraph g;g.add(std::make_shared<test::Service>("a",std::vector<std::string>{},e));g.add(std::make_shared<test::Service>("b",std::vector<std::string>{"a"},e));g.add(std::make_shared<test::Service>("c",std::vector<std::string>{"b"},e));auto o=g.ordered();assert(o.size()==3&&o[0]->name()=="a"&&o[1]->name()=="b"&&o[2]->name()=="c");ServiceGraph cycle;cycle.add(std::make_shared<test::Service>("x",std::vector<std::string>{"y"},e));cycle.add(std::make_shared<test::Service>("y",std::vector<std::string>{"x"},e));bool threw=false;try{cycle.ordered();}catch(const ServiceError&){threw=true;}assert(threw);}
