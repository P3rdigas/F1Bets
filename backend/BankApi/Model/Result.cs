namespace BankApi.Models;

public class Result<T>(bool success, T? value = default, string? message = null)
{
    public bool Success { get; } = success;
    public T? Value { get; } = value;
    public string? Message { get; } = message;

    public static Result<T> Ok(T value) => new(true, value, null);
    public static Result<T> Error(string message) => new(false, default, message);
}
