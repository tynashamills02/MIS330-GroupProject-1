using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;
using System.Data;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LoginController : ControllerBase
{
    private readonly MySqlConnection _connection;

    public LoginController(MySqlConnection connection)
    {
        _connection = connection;
    }

    // POST: api/Login
    [HttpPost]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) || 
            string.IsNullOrWhiteSpace(request.LastName) || 
            string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            return BadRequest(new { message = "First name, last name, and phone number are required" });
        }

        try
        {
            await _connection.OpenAsync();

            // Check in Customer table
            var customerCommand = new MySqlCommand(
                "SELECT custid, firstname, lastname, phonenum, address FROM Customer WHERE firstname = @firstname AND lastname = @lastname AND phonenum = @phonenum",
                _connection);
            customerCommand.Parameters.AddWithValue("@firstname", request.FirstName);
            customerCommand.Parameters.AddWithValue("@lastname", request.LastName);
            customerCommand.Parameters.AddWithValue("@phonenum", request.PhoneNumber);

            using var customerReader = await customerCommand.ExecuteReaderAsync();
            if (await customerReader.ReadAsync())
            {
                return Ok(new LoginResponse
                {
                    Success = true,
                    UserType = "customer",
                    UserId = customerReader.GetInt32("custid"),
                    FirstName = customerReader.GetString("firstname"),
                    LastName = customerReader.GetString("lastname"),
                    PhoneNumber = customerReader.GetString("phonenum")
                });
            }

            await customerReader.CloseAsync();

            // Check in Trainer table
            var trainerCommand = new MySqlCommand(
                "SELECT trainerid, firstname, lastname, phonenum, speciality FROM Trainer WHERE firstname = @firstname AND lastname = @lastname AND phonenum = @phonenum",
                _connection);
            trainerCommand.Parameters.AddWithValue("@firstname", request.FirstName);
            trainerCommand.Parameters.AddWithValue("@lastname", request.LastName);
            trainerCommand.Parameters.AddWithValue("@phonenum", request.PhoneNumber);

            using var trainerReader = await trainerCommand.ExecuteReaderAsync();
            if (await trainerReader.ReadAsync())
            {
                return Ok(new LoginResponse
                {
                    Success = true,
                    UserType = "trainer",
                    UserId = trainerReader.GetInt32("trainerid"),
                    FirstName = trainerReader.GetString("firstname"),
                    LastName = trainerReader.GetString("lastname"),
                    PhoneNumber = trainerReader.GetString("phonenum")
                });
            }

            await trainerReader.CloseAsync();

            // Check in Employee table for admin
            var employeeCommand = new MySqlCommand(
                "SELECT empid, firstname, lastname, position FROM Employee WHERE firstname = @firstname AND lastname = @lastname",
                _connection);
            employeeCommand.Parameters.AddWithValue("@firstname", request.FirstName);
            employeeCommand.Parameters.AddWithValue("@lastname", request.LastName);

            using var employeeReader = await employeeCommand.ExecuteReaderAsync();
            if (await employeeReader.ReadAsync())
            {
                // Check if phone number matches admin phone
                if (request.PhoneNumber == "111-111-1111")
                {
                    return Ok(new LoginResponse
                    {
                        Success = true,
                        UserType = "admin",
                        UserId = employeeReader.GetInt32("empid"),
                        FirstName = employeeReader.GetString("firstname"),
                        LastName = employeeReader.GetString("lastname"),
                        PhoneNumber = request.PhoneNumber
                    });
                }
                else
                {
                    // Employee exists but phone doesn't match admin phone
                    return Unauthorized(new { message = "Invalid credentials. Please check your first name, last name, and phone number." });
                }
            }

            // Credentials not found
            return Unauthorized(new { message = "Invalid credentials. Please check your first name, last name, and phone number." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error during login", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }
}

public class LoginRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
}

public class LoginResponse
{
    public bool Success { get; set; }
    public string UserType { get; set; } = string.Empty; // "customer", "trainer", or "admin"
    public int UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
}

