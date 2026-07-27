# CLI Integration

Inside the existing EXOTIC command dispatcher, strip the leading
`resources` token and call:

```cpp
return exotic::autonomy::resources::run_resource_cli(
    resource_arguments,
    resource_governor,
    resource_repository,
    std::cout,
    std::cerr
);
```

Commands:

```text
resources status
resources accounts
resources reservations
resources anomalies
resources circuits
resources forecast <workload-key>
resources recover
resources stop
resources resume
```
