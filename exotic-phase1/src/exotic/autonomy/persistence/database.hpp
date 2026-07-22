#pragma once
#include <cstdint>
#include <filesystem>
#include <mutex>
#include <stdexcept>
#include <string>
#include <string_view>
struct sqlite3; struct sqlite3_stmt;
namespace exotic::autonomy::persistence {
class DatabaseError final:public std::runtime_error{public:explicit DatabaseError(const std::string&m):std::runtime_error(m){}};
class Statement; class Transaction;
class Database {
public:
    explicit Database(const std::filesystem::path&); ~Database();
    Database(const Database&)=delete; Database&operator=(const Database&)=delete; Database(Database&&)=delete; Database&operator=(Database&&)=delete;
    void execute(std::string_view); sqlite3* native_handle()const noexcept; std::int64_t last_insert_row_id()const noexcept; std::uint64_t next_sequence(std::string_view name);
private: friend class Statement; friend class Transaction; sqlite3* handle_{nullptr}; mutable std::recursive_mutex mutex_; void configure();
};
class Statement {
public:
    Statement(Database&,std::string_view); ~Statement(); Statement(const Statement&)=delete; Statement&operator=(const Statement&)=delete;
    void bind(std::size_t,std::int64_t); void bind(std::size_t,double); void bind(std::size_t,std::string_view); void bind_null(std::size_t);
    bool step(); void execute(); std::int64_t column_int64(int)const; double column_double(int)const; std::string column_text(int)const; bool column_is_null(int)const;
private: std::unique_lock<std::recursive_mutex> lock_; sqlite3* database_{nullptr}; sqlite3_stmt* statement_{nullptr};
};
}
