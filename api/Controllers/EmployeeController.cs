using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;
using System.Data;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeeController : ControllerBase
{
    private readonly MySqlConnection _connection;

    public EmployeeController(MySqlConnection connection)
    {
        _connection = connection;
    }

    // GET: api/Employee
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Employee>>> GetAllEmployees()
    {
        try
        {
            await _connection.OpenAsync();
            var employees = new List<Employee>();
            var command = new MySqlCommand("SELECT EmployeeId, FirstName, LastName, Email, Phone, Position, HireDate FROM Employee", _connection);
            
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                employees.Add(new Employee
                {
                    EmployeeId = reader.GetInt32("EmployeeId"),
                    FirstName = reader.GetString("FirstName"),
                    LastName = reader.GetString("LastName"),
                    Email = reader.IsDBNull("Email") ? null : reader.GetString("Email"),
                    Phone = reader.IsDBNull("Phone") ? null : reader.GetString("Phone"),
                    Position = reader.IsDBNull("Position") ? null : reader.GetString("Position"),
                    HireDate = reader.IsDBNull("HireDate") ? null : reader.GetDateTime("HireDate")
                });
            }
            
            return Ok(employees);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving employees", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // GET: api/Employee/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Employee>> GetEmployee(int id)
    {
        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand("SELECT EmployeeId, FirstName, LastName, Email, Phone, Position, HireDate FROM Employee WHERE EmployeeId = @id", _connection);
            command.Parameters.AddWithValue("@id", id);
            
            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                var employee = new Employee
                {
                    EmployeeId = reader.GetInt32("EmployeeId"),
                    FirstName = reader.GetString("FirstName"),
                    LastName = reader.GetString("LastName"),
                    Email = reader.IsDBNull("Email") ? null : reader.GetString("Email"),
                    Phone = reader.IsDBNull("Phone") ? null : reader.GetString("Phone"),
                    Position = reader.IsDBNull("Position") ? null : reader.GetString("Position"),
                    HireDate = reader.IsDBNull("HireDate") ? null : reader.GetDateTime("HireDate")
                };
                return Ok(employee);
            }
            
            return NotFound(new { message = $"Employee with ID {id} not found" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving employee", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // POST: api/Employee
    [HttpPost]
    public async Task<ActionResult<Employee>> CreateEmployee([FromBody] Employee employee)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand(
                "INSERT INTO Employee (FirstName, LastName, Email, Phone, Position, HireDate) VALUES (@FirstName, @LastName, @Email, @Phone, @Position, @HireDate); SELECT LAST_INSERT_ID();",
                _connection);
            
            command.Parameters.AddWithValue("@FirstName", employee.FirstName);
            command.Parameters.AddWithValue("@LastName", employee.LastName);
            command.Parameters.AddWithValue("@Email", (object?)employee.Email ?? DBNull.Value);
            command.Parameters.AddWithValue("@Phone", (object?)employee.Phone ?? DBNull.Value);
            command.Parameters.AddWithValue("@Position", (object?)employee.Position ?? DBNull.Value);
            command.Parameters.AddWithValue("@HireDate", (object?)employee.HireDate ?? DBNull.Value);
            
            var newId = Convert.ToInt32(await command.ExecuteScalarAsync());
            employee.EmployeeId = newId;
            
            return CreatedAtAction(nameof(GetEmployee), new { id = newId }, employee);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating employee", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // PUT: api/Employee/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmployee(int id, [FromBody] Employee employee)
    {
        if (id != employee.EmployeeId)
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
                "UPDATE Employee SET FirstName = @FirstName, LastName = @LastName, Email = @Email, Phone = @Phone, Position = @Position, HireDate = @HireDate WHERE EmployeeId = @EmployeeId",
                _connection);
            
            command.Parameters.AddWithValue("@EmployeeId", id);
            command.Parameters.AddWithValue("@FirstName", employee.FirstName);
            command.Parameters.AddWithValue("@LastName", employee.LastName);
            command.Parameters.AddWithValue("@Email", (object?)employee.Email ?? DBNull.Value);
            command.Parameters.AddWithValue("@Phone", (object?)employee.Phone ?? DBNull.Value);
            command.Parameters.AddWithValue("@Position", (object?)employee.Position ?? DBNull.Value);
            command.Parameters.AddWithValue("@HireDate", (object?)employee.HireDate ?? DBNull.Value);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return NotFound(new { message = $"Employee with ID {id} not found" });
            }
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating employee", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // DELETE: api/Employee/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmployee(int id)
    {
        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand("DELETE FROM Employee WHERE EmployeeId = @id", _connection);
            command.Parameters.AddWithValue("@id", id);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return NotFound(new { message = $"Employee with ID {id} not found" });
            }
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting employee", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }
}

public class Employee
{
    public int EmployeeId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Position { get; set; }
    public DateTime? HireDate { get; set; }
}

