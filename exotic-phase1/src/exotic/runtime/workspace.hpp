#pragma once
#include <filesystem>
#include <string>

namespace exotic::runtime {
struct WorkspacePaths {
    std::filesystem::path root;
    std::filesystem::path exotic;
    std::filesystem::path state;
    std::filesystem::path logs;
    std::filesystem::path dashboards;
    std::filesystem::path runtime_database;
    std::filesystem::path lock_directory;
};
class WorkspaceContext {
public:
    explicit WorkspaceContext(std::filesystem::path root);
    const WorkspacePaths& paths()const noexcept{return paths_;}
    bool contains(const std::filesystem::path& path)const;
private:WorkspacePaths paths_;
};
class WorkspaceLease {
public:
    explicit WorkspaceLease(const WorkspacePaths& paths);
    ~WorkspaceLease();
    WorkspaceLease(const WorkspaceLease&)=delete;WorkspaceLease&operator=(const WorkspaceLease&)=delete;
private:std::filesystem::path lock_;bool held_{false};
};
}
