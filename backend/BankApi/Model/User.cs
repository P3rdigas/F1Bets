namespace BankApi.Models;

public class User(string name, string email, string password)
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = name;
    public string Email { get; set; } = email;
    public string Password { get; set; } = password; // TODO: need to hash
    public int Balance { get; set; } = 0;
}