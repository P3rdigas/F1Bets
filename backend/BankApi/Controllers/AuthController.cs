using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BankApi.Models;
using BankApi.Services;

namespace BankApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IUserService userService, JwtService jwtService) : ControllerBase
{
    IUserService _userService = userService;
    private readonly JwtService _jwtService = jwtService;

    [HttpPost("register")]
    [AllowAnonymous]
    public IActionResult Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
            
        var result = _userService.Register(request);
        if (!result.Success)
        {
            return BadRequest(result.Message);
        }
            
        return Ok(result.Value);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = _userService.GetByEmail(request.Email);

        if (!result.Success)
        {
            return Unauthorized(result.Message);
        }

        var user = result.Value;

        if (user.Password != request.Password)  // TODO: hash passwords
            return Unauthorized("Wrong password");

        var token = _jwtService.GenerateToken(user.Id, user.Name, user.Email);
        return Ok(new { token });
    }
}