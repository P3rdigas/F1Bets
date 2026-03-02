using System.Collections.Concurrent;
using BankApi.Models;

namespace BankApi.Services;

public class UserService : IUserService
{
    ConcurrentQueue<User> _usersList = new ConcurrentQueue<User>();

    public Result<User> Register(RegisterRequest request)
    {        
        // Email already in use
        if (_usersList.Any(u => u.Email == request.Email))
        {
            return Result<User>.Error("Email already exists");
        }
        
        var user = new User(request.Name, request.Email, request.Password);
        _usersList.Enqueue(user);
        return Result<User>.Ok(user);
    }

    public Result<User>? GetByEmail(string email)
    {
        var user = _usersList.FirstOrDefault(u => u.Email == email);
        return user != null ? Result<User>.Ok(user) : Result<User>.Error("No user found");
    }
}