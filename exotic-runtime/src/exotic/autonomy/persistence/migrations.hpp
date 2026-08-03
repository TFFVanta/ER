#pragma once
#include "database.hpp"
namespace exotic::autonomy::persistence { class MigrationRunner { public: static void migrate(Database&); }; }
