#pragma once
#include "database.hpp"
namespace exotic::autonomy::persistence {
class Transaction { public: explicit Transaction(Database&); ~Transaction(); Transaction(const Transaction&)=delete; Transaction&operator=(const Transaction&)=delete; void commit(); void rollback(); private: Database* database_{nullptr}; std::unique_lock<std::recursive_mutex> lock_; bool active_{false}; };
}
