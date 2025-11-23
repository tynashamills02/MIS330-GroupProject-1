using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;
using System.Data;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClassController : ControllerBase
{
    private readonly MySqlConnection _connection;

    public ClassController(MySqlConnection connection)
    {
        _connection = connection;
    }

    // GET: api/Class
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Class>>> GetAllClasses()
    {
        try
        {
            await _connection.OpenAsync();
            var classes = new List<Class>();
            var command = new MySqlCommand("SELECT classid, trainerid, classtype, title, description, location, starttime, endtime, startdate, enddate, maxcapacity, price, category FROM Class", _connection);
            
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                classes.Add(new Class
                {
                    ClassId = reader.GetInt32("classid"),
                    TrainerId = reader.GetInt32("trainerid"),
                    ClassType = reader.GetString("classtype"),
                    Title = reader.GetString("title"),
                    Description = reader.GetString("description"),
                    Location = reader.GetString("location"),
                    StartTime = reader.GetDateTime("starttime").TimeOfDay,
                    EndTime = reader.GetDateTime("endtime").TimeOfDay,
                    StartDate = reader.GetDateTime("startdate"),
                    EndDate = reader.GetDateTime("enddate"),
                    MaxCapacity = reader.GetInt32("maxcapacity"),
                    Price = reader.GetDecimal("price"),
                    Category = reader.IsDBNull("category") ? null : reader.GetString("category")
                });
            }
            
            return Ok(classes);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving classes", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // GET: api/Class/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Class>> GetClass(int id)
    {
        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand("SELECT classid, trainerid, classtype, title, description, location, starttime, endtime, startdate, enddate, maxcapacity, price, category FROM Class WHERE classid = @id", _connection);
            command.Parameters.AddWithValue("@id", id);
            
            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                var classItem = new Class
                {
                    ClassId = reader.GetInt32("classid"),
                    TrainerId = reader.GetInt32("trainerid"),
                    ClassType = reader.GetString("classtype"),
                    Title = reader.GetString("title"),
                    Description = reader.GetString("description"),
                    Location = reader.GetString("location"),
                    StartTime = reader.GetDateTime("starttime").TimeOfDay,
                    EndTime = reader.GetDateTime("endtime").TimeOfDay,
                    StartDate = reader.GetDateTime("startdate"),
                    EndDate = reader.GetDateTime("enddate"),
                    MaxCapacity = reader.GetInt32("maxcapacity"),
                    Price = reader.GetDecimal("price"),
                    Category = reader.IsDBNull("category") ? null : reader.GetString("category")
                };
                return Ok(classItem);
            }
            
            return NotFound(new { message = $"Class with ID {id} not found" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving class", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // POST: api/Class
    [HttpPost]
    public async Task<ActionResult<Class>> CreateClass([FromBody] Class classItem)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand(
                "INSERT INTO Class (trainerid, classtype, title, description, location, starttime, endtime, startdate, enddate, maxcapacity, price, category) VALUES (@trainerid, @classtype, @title, @description, @location, @starttime, @endtime, @startdate, @enddate, @maxcapacity, @price, @category); SELECT LAST_INSERT_ID();",
                _connection);
            
            command.Parameters.AddWithValue("@trainerid", classItem.TrainerId);
            command.Parameters.AddWithValue("@classtype", classItem.ClassType);
            command.Parameters.AddWithValue("@title", classItem.Title);
            command.Parameters.AddWithValue("@description", classItem.Description);
            command.Parameters.AddWithValue("@location", classItem.Location);
            command.Parameters.AddWithValue("@starttime", classItem.StartTime);
            command.Parameters.AddWithValue("@endtime", classItem.EndTime);
            command.Parameters.AddWithValue("@startdate", classItem.StartDate);
            command.Parameters.AddWithValue("@enddate", classItem.EndDate);
            command.Parameters.AddWithValue("@maxcapacity", classItem.MaxCapacity);
            command.Parameters.AddWithValue("@price", classItem.Price);
            command.Parameters.AddWithValue("@category", (object?)classItem.Category ?? DBNull.Value);
            
            var newId = Convert.ToInt32(await command.ExecuteScalarAsync());
            classItem.ClassId = newId;
            
            return CreatedAtAction(nameof(GetClass), new { id = newId }, classItem);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating class", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // PUT: api/Class/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateClass(int id, [FromBody] Class classItem)
    {
        if (id != classItem.ClassId)
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
                "UPDATE Class SET trainerid = @trainerid, classtype = @classtype, title = @title, description = @description, location = @location, starttime = @starttime, endtime = @endtime, startdate = @startdate, enddate = @enddate, maxcapacity = @maxcapacity, price = @price, category = @category WHERE classid = @classid",
                _connection);
            
            command.Parameters.AddWithValue("@classid", id);
            command.Parameters.AddWithValue("@trainerid", classItem.TrainerId);
            command.Parameters.AddWithValue("@classtype", classItem.ClassType);
            command.Parameters.AddWithValue("@title", classItem.Title);
            command.Parameters.AddWithValue("@description", classItem.Description);
            command.Parameters.AddWithValue("@location", classItem.Location);
            command.Parameters.AddWithValue("@starttime", classItem.StartTime);
            command.Parameters.AddWithValue("@endtime", classItem.EndTime);
            command.Parameters.AddWithValue("@startdate", classItem.StartDate);
            command.Parameters.AddWithValue("@enddate", classItem.EndDate);
            command.Parameters.AddWithValue("@maxcapacity", classItem.MaxCapacity);
            command.Parameters.AddWithValue("@price", classItem.Price);
            command.Parameters.AddWithValue("@category", (object?)classItem.Category ?? DBNull.Value);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return NotFound(new { message = $"Class with ID {id} not found" });
            }
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating class", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // DELETE: api/Class/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteClass(int id)
    {
        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand("DELETE FROM Class WHERE classid = @id", _connection);
            command.Parameters.AddWithValue("@id", id);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return NotFound(new { message = $"Class with ID {id} not found" });
            }
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting class", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }
}

public class Class
{
    public int ClassId { get; set; }
    public int TrainerId { get; set; }
    public string ClassType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int MaxCapacity { get; set; }
    public decimal Price { get; set; }
    public string? Category { get; set; }
}

