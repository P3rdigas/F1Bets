using BankApi.Models;

namespace BankApi.Services;

public interface IUserService
{
    Result<User> Register(RegisterRequest request);
    Result<User>? GetByUsername(string username);
}