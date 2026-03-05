using System.Collections.Concurrent;
using BankApi.Models;

namespace BankApi.Services;

public class UserService : IUserService
{
    ConcurrentQueue<User> _usersList = new ConcurrentQueue<User>();

    public Result<User> Register(RegisterRequest request)
    {        
        // Email already in use
        if (_usersList.Any(u => u.Username == request.Username))
        {
            return Result<User>.Error("Username already exists");
        }
        
        var user = new User(request.Username, request.Password);
        _usersList.Enqueue(user);
        return Result<User>.Ok(user);
    }

    public Result<User>? GetByUsername(string username)
    {
        var user = _usersList.FirstOrDefault(u => u.Username == username);
        return user != null ? Result<User>.Ok(user) : Result<User>.Error("No user found");
    }
}