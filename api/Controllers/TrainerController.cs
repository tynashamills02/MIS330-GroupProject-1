using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;
using System.Data;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TrainerController : ControllerBase
{
    private readonly MySqlConnection _connection;

    public TrainerController(MySqlConnection connection)
    {
        _connection = connection;
    }

    // GET: api/Trainer
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Trainer>>> GetAllTrainers()
    {
        try
        {
            await _connection.OpenAsync();
            var trainers = new List<Trainer>();
            var command = new MySqlCommand("SELECT trainerid, firstname, lastname, phonenum, speciality FROM Trainer", _connection);
            
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                trainers.Add(new Trainer
                {
                    TrainerId = reader.GetInt32("trainerid"),
                    FirstName = reader.GetString("firstname"),
                    LastName = reader.GetString("lastname"),
                    PhoneNum = reader.GetString("phonenum"),
                    Speciality = reader.IsDBNull("speciality") ? null : reader.GetString("speciality")
                });
            }
            
            return Ok(trainers);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving trainers", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // GET: api/Trainer/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Trainer>> GetTrainer(int id)
    {
        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand("SELECT trainerid, firstname, lastname, phonenum, speciality FROM Trainer WHERE trainerid = @id", _connection);
            command.Parameters.AddWithValue("@id", id);
            
            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                var trainer = new Trainer
                {
                    TrainerId = reader.GetInt32("trainerid"),
                    FirstName = reader.GetString("firstname"),
                    LastName = reader.GetString("lastname"),
                    PhoneNum = reader.GetString("phonenum"),
                    Speciality = reader.IsDBNull("speciality") ? null : reader.GetString("speciality")
                };
                return Ok(trainer);
            }
            
            return NotFound(new { message = $"Trainer with ID {id} not found" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving trainer", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // POST: api/Trainer
    [HttpPost]
    public async Task<ActionResult<Trainer>> CreateTrainer([FromBody] Trainer trainer)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand(
                "INSERT INTO Trainer (firstname, lastname, phonenum, speciality) VALUES (@firstname, @lastname, @phonenum, @speciality); SELECT LAST_INSERT_ID();",
                _connection);
            
            command.Parameters.AddWithValue("@firstname", trainer.FirstName);
            command.Parameters.AddWithValue("@lastname", trainer.LastName);
            command.Parameters.AddWithValue("@phonenum", trainer.PhoneNum);
            command.Parameters.AddWithValue("@speciality", (object?)trainer.Speciality ?? DBNull.Value);
            
            var newId = Convert.ToInt32(await command.ExecuteScalarAsync());
            trainer.TrainerId = newId;
            
            return CreatedAtAction(nameof(GetTrainer), new { id = newId }, trainer);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating trainer", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // PUT: api/Trainer/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTrainer(int id, [FromBody] Trainer trainer)
    {
        if (id != trainer.TrainerId)
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
                "UPDATE Trainer SET firstname = @firstname, lastname = @lastname, phonenum = @phonenum, speciality = @speciality WHERE trainerid = @trainerid",
                _connection);
            
            command.Parameters.AddWithValue("@trainerid", id);
            command.Parameters.AddWithValue("@firstname", trainer.FirstName);
            command.Parameters.AddWithValue("@lastname", trainer.LastName);
            command.Parameters.AddWithValue("@phonenum", trainer.PhoneNum);
            command.Parameters.AddWithValue("@speciality", (object?)trainer.Speciality ?? DBNull.Value);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return NotFound(new { message = $"Trainer with ID {id} not found" });
            }
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating trainer", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // DELETE: api/Trainer/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTrainer(int id)
    {
        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand("DELETE FROM Trainer WHERE trainerid = @id", _connection);
            command.Parameters.AddWithValue("@id", id);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return NotFound(new { message = $"Trainer with ID {id} not found" });
            }
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting trainer", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }
}

public class Trainer
{
    public int TrainerId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PhoneNum { get; set; } = string.Empty;
    public string? Speciality { get; set; }
}

