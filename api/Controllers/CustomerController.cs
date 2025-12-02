using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;
using System.Data;
using System.Text.Json.Serialization;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomerController : ControllerBase
{
    private readonly MySqlConnection _connection;

    public CustomerController(MySqlConnection connection)
    {
        _connection = connection;
    }

    // GET: api/Customer
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Customer>>> GetAllCustomers()
    {
        try
        {
            await _connection.OpenAsync();
            var customers = new List<Customer>();
            var command = new MySqlCommand("SELECT custid, firstname, lastname, phonenum, address FROM Customer", _connection);
            
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                customers.Add(new Customer
                {
                    CustomerId = reader.GetInt32("custid"),
                    FirstName = reader.GetString("firstname"),
                    LastName = reader.GetString("lastname"),
                    PhoneNum = reader.GetString("phonenum"),
                    Address = reader.IsDBNull("address") ? null : reader.GetString("address")
                });
            }
            
            return Ok(customers);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving customers", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // GET: api/Customer/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Customer>> GetCustomer(int id)
    {
        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand("SELECT custid, firstname, lastname, phonenum, address FROM Customer WHERE custid = @id", _connection);
            command.Parameters.AddWithValue("@id", id);
            
            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                var customer = new Customer
                {
                    CustomerId = reader.GetInt32("custid"),
                    FirstName = reader.GetString("firstname"),
                    LastName = reader.GetString("lastname"),
                    PhoneNum = reader.GetString("phonenum"),
                    Address = reader.IsDBNull("address") ? null : reader.GetString("address")
                };
                return Ok(customer);
            }
            
            return NotFound(new { message = $"Customer with ID {id} not found" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving customer", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // POST: api/Customer
    [HttpPost]
    public async Task<ActionResult<Customer>> CreateCustomer([FromBody] Customer customer)
    {
        // Validate required fields
        if (customer == null)
        {
            return BadRequest(new { message = "Customer data is required" });
        }

        // Trim and validate required fields
        var firstName = customer.FirstName?.Trim() ?? string.Empty;
        var lastName = customer.LastName?.Trim() ?? string.Empty;
        var phoneNum = customer.PhoneNum?.Trim() ?? string.Empty;
        var address = customer.Address?.Trim();

        if (string.IsNullOrWhiteSpace(firstName))
        {
            return BadRequest(new { message = "First name is required" });
        }

        if (string.IsNullOrWhiteSpace(lastName))
        {
            return BadRequest(new { message = "Last name is required" });
        }

        if (string.IsNullOrWhiteSpace(phoneNum))
        {
            return BadRequest(new { message = "Phone number is required" });
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand(
                "INSERT INTO Customer (firstname, lastname, phonenum, address) VALUES (@firstname, @lastname, @phonenum, @address); SELECT LAST_INSERT_ID();",
                _connection);
            
            // Map JSON properties to database columns - use trimmed values
            // Defensive check: never insert empty strings for required fields
            command.Parameters.AddWithValue("@firstname", firstName);
            command.Parameters.AddWithValue("@lastname", lastName);
            command.Parameters.AddWithValue("@phonenum", phoneNum);
            // Address is optional (nullable) - only insert if not empty
            command.Parameters.AddWithValue("@address", string.IsNullOrWhiteSpace(address) ? DBNull.Value : address);
            
            var newId = Convert.ToInt32(await command.ExecuteScalarAsync());
            customer.CustomerId = newId;
            customer.FirstName = firstName;
            customer.LastName = lastName;
            customer.PhoneNum = phoneNum;
            customer.Address = address;
            
            return CreatedAtAction(nameof(GetCustomer), new { id = newId }, customer);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating customer", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // PUT: api/Customer/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCustomer(int id, [FromBody] Customer customer)
    {
        if (id != customer.CustomerId)
        {
            return BadRequest(new { message = "ID mismatch" });
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand(
                "UPDATE Customer SET firstname = @firstname, lastname = @lastname, phonenum = @phonenum, address = @address WHERE custid = @custid",
                _connection);
            
            command.Parameters.AddWithValue("@custid", id);
            command.Parameters.AddWithValue("@firstname", customer.FirstName);
            command.Parameters.AddWithValue("@lastname", customer.LastName);
            command.Parameters.AddWithValue("@phonenum", customer.PhoneNum);
            command.Parameters.AddWithValue("@address", (object?)customer.Address ?? DBNull.Value);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return NotFound(new { message = $"Customer with ID {id} not found" });
            }
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating customer", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // DELETE: api/Customer/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand("DELETE FROM Customer WHERE custid = @id", _connection);
            command.Parameters.AddWithValue("@id", id);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return NotFound(new { message = $"Customer with ID {id} not found" });
            }
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting customer", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }
}

public class Customer
{
    [JsonPropertyName("customerId")]
    public int CustomerId { get; set; }
    
    [JsonPropertyName("firstName")]
    public string FirstName { get; set; } = string.Empty;
    
    [JsonPropertyName("lastName")]
    public string LastName { get; set; } = string.Empty;
    
    [JsonPropertyName("phoneNum")]
    public string PhoneNum { get; set; } = string.Empty;
    
    [JsonPropertyName("address")]
    public string? Address { get; set; }
}

