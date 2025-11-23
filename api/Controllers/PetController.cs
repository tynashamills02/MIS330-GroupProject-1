using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;
using System.Data;

namespace api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PetController : ControllerBase
{
    private readonly MySqlConnection _connection;

    public PetController(MySqlConnection connection)
    {
        _connection = connection;
    }

    // GET: api/Pet
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Pet>>> GetAllPets()
    {
        try
        {
            await _connection.OpenAsync();
            var pets = new List<Pet>();
            var command = new MySqlCommand("SELECT petid, custid, name, species, birthdate, breed, notes FROM Pet", _connection);
            
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                pets.Add(new Pet
                {
                    PetId = reader.GetInt32("petid"),
                    CustomerId = reader.GetInt32("custid"),
                    Name = reader.GetString("name"),
                    Species = reader.GetString("species"),
                    BirthDate = reader.GetDateTime("birthdate"),
                    Breed = reader.IsDBNull("breed") ? null : reader.GetString("breed"),
                    Notes = reader.IsDBNull("notes") ? null : reader.GetString("notes")
                });
            }
            
            return Ok(pets);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving pets", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // GET: api/Pet/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Pet>> GetPet(int id)
    {
        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand("SELECT petid, custid, name, species, birthdate, breed, notes FROM Pet WHERE petid = @id", _connection);
            command.Parameters.AddWithValue("@id", id);
            
            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                var pet = new Pet
                {
                    PetId = reader.GetInt32("petid"),
                    CustomerId = reader.GetInt32("custid"),
                    Name = reader.GetString("name"),
                    Species = reader.GetString("species"),
                    BirthDate = reader.GetDateTime("birthdate"),
                    Breed = reader.IsDBNull("breed") ? null : reader.GetString("breed"),
                    Notes = reader.IsDBNull("notes") ? null : reader.GetString("notes")
                };
                return Ok(pet);
            }
            
            return NotFound(new { message = $"Pet with ID {id} not found" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error retrieving pet", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // POST: api/Pet
    [HttpPost]
    public async Task<ActionResult<Pet>> CreatePet([FromBody] Pet pet)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand(
                "INSERT INTO Pet (custid, name, species, birthdate, breed, notes) VALUES (@custid, @name, @species, @birthdate, @breed, @notes); SELECT LAST_INSERT_ID();",
                _connection);
            
            command.Parameters.AddWithValue("@custid", pet.CustomerId);
            command.Parameters.AddWithValue("@name", pet.Name);
            command.Parameters.AddWithValue("@species", pet.Species);
            command.Parameters.AddWithValue("@birthdate", pet.BirthDate);
            command.Parameters.AddWithValue("@breed", (object?)pet.Breed ?? DBNull.Value);
            command.Parameters.AddWithValue("@notes", (object?)pet.Notes ?? DBNull.Value);
            
            var newId = Convert.ToInt32(await command.ExecuteScalarAsync());
            pet.PetId = newId;
            
            return CreatedAtAction(nameof(GetPet), new { id = newId }, pet);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error creating pet", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // PUT: api/Pet/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePet(int id, [FromBody] Pet pet)
    {
        if (id != pet.PetId)
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
                "UPDATE Pet SET custid = @custid, name = @name, species = @species, birthdate = @birthdate, breed = @breed, notes = @notes WHERE petid = @petid",
                _connection);
            
            command.Parameters.AddWithValue("@petid", id);
            command.Parameters.AddWithValue("@custid", pet.CustomerId);
            command.Parameters.AddWithValue("@name", pet.Name);
            command.Parameters.AddWithValue("@species", pet.Species);
            command.Parameters.AddWithValue("@birthdate", pet.BirthDate);
            command.Parameters.AddWithValue("@breed", (object?)pet.Breed ?? DBNull.Value);
            command.Parameters.AddWithValue("@notes", (object?)pet.Notes ?? DBNull.Value);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return NotFound(new { message = $"Pet with ID {id} not found" });
            }
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error updating pet", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }

    // DELETE: api/Pet/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePet(int id)
    {
        try
        {
            await _connection.OpenAsync();
            var command = new MySqlCommand("DELETE FROM Pet WHERE petid = @id", _connection);
            command.Parameters.AddWithValue("@id", id);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            
            if (rowsAffected == 0)
            {
                return NotFound(new { message = $"Pet with ID {id} not found" });
            }
            
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error deleting pet", error = ex.Message });
        }
        finally
        {
            if (_connection.State == ConnectionState.Open)
                await _connection.CloseAsync();
        }
    }
}

public class Pet
{
    public int PetId { get; set; }
    public int CustomerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Species { get; set; } = string.Empty;
    public DateTime BirthDate { get; set; }
    public string? Breed { get; set; }
    public string? Notes { get; set; }
}

