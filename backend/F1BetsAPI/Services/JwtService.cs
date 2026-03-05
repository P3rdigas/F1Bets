using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace BankApi.Services;

public class JwtService(IConfiguration config)
{
    readonly IConfiguration _config = config;

    public string GenerateToken(Guid id, string username)
    {
        var key = Encoding.UTF8.GetBytes(_config["JWT_KEY"]!);
        var creds = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, id.ToString()),
            new Claim(ClaimTypes.Name, username),         
        };

        var token = new JwtSecurityToken(
            issuer: _config["JWT_ISSUER"]!,
            audience: _config["JWT_AUDIENCE"]!,
            claims: claims,
            expires: DateTime.Now.AddMinutes(60),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
