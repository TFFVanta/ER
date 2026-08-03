#include "transaction.hpp"
namespace exotic::autonomy::persistence {
Transaction::Transaction(Database&d):database_(&d),lock_(d.mutex_),active_(true){database_->execute("BEGIN IMMEDIATE TRANSACTION;");}
Transaction::~Transaction(){if(active_&&database_)try{database_->execute("ROLLBACK;");}catch(...){}}
void Transaction::commit(){if(!active_)return;database_->execute("COMMIT;");active_=false;}
void Transaction::rollback(){if(!active_)return;database_->execute("ROLLBACK;");active_=false;}
}
