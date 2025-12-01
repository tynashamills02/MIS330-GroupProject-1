// API Configuration
const API_BASE_URL = 'http://localhost:5172/api';

// Global state
let currentDeleteCallback = null;
let currentDeleteId = null;
let currentDeleteEntity = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeNavigation();
  loadCustomers();
  setupDeleteModal();
});

// Navigation Setup
function initializeNavigation() {
  const navLinks = document.querySelectorAll('.nav-link[data-section]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.getAttribute('data-section');
      showSection(section);
      
      // Update active nav link
      navLinks.forEach(nl => nl.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

// Show specific section
function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Show selected section
  const targetSection = document.getElementById(`${sectionName}-section`);
  if (targetSection) {
    targetSection.style.display = 'block';
    
    // Load data for the section
    switch(sectionName) {
      case 'customers':
        loadCustomers();
        break;
      case 'pets':
        loadPets();
        break;
      case 'trainers':
        loadTrainers();
        break;
      case 'employees':
        loadEmployees();
        break;
      case 'classes':
        loadClasses();
        break;
      case 'bookings':
        loadBookings();
        break;
    }
  }
}

// Alert helper
function showAlert(message, type = 'success') {
  const alertContainer = document.getElementById('alertContainer');
  const alertId = `alert-${Date.now()}`;
  const alertHtml = `
    <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  alertContainer.innerHTML = alertHtml;
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const alert = document.getElementById(alertId);
    if (alert) {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }
  }, 5000);
}

// Generic API call function
async function apiCall(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `HTTP error! status: ${response.status}` 
      }));
      // Include the error details if available
      const errorMessage = errorData.error 
        ? `${errorData.message}: ${errorData.error}` 
        : (errorData.message || `HTTP error! status: ${response.status}`);
      throw new Error(errorMessage);
    }
    
    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    // Handle network errors
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Cannot connect to API. Make sure the API server is running on http://localhost:5172');
    }
    console.error('API Error:', error);
    throw error;
  }
}

// ==================== CUSTOMERS ====================
async function loadCustomers() {
  try {
    const customers = await apiCall('Customer');
    const tbody = document.getElementById('customers-table-body');
    
    if (customers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No customers found</td></tr>';
      return;
    }
    
    tbody.innerHTML = customers.map(customer => `
      <tr>
        <td>${customer.customerId}</td>
        <td>${customer.firstName}</td>
        <td>${customer.lastName}</td>
        <td>${customer.phoneNum}</td>
        <td>${customer.address || '-'}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editCustomer(${customer.customerId})">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.customerId})">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    const errorMsg = error.message || 'Unknown error';
    showAlert(`Error loading customers: ${errorMsg}`, 'danger');
    document.getElementById('customers-table-body').innerHTML = 
      `<tr><td colspan="6" class="text-center text-danger">Error: ${errorMsg}</td></tr>`;
  }
}

function openCustomerModal(customer = null) {
  const modal = new bootstrap.Modal(document.getElementById('customerModal'));
  const form = document.getElementById('customerForm');
  form.reset();
  document.getElementById('customerId').value = '';
  
  if (customer) {
    document.getElementById('customerModalTitle').textContent = 'Edit Customer';
    document.getElementById('customerId').value = customer.customerId;
    document.getElementById('customerFirstName').value = customer.firstName;
    document.getElementById('customerLastName').value = customer.lastName;
    document.getElementById('customerPhone').value = customer.phoneNum;
    document.getElementById('customerAddress').value = customer.address || '';
  } else {
    document.getElementById('customerModalTitle').textContent = 'Add Customer';
  }
  
  modal.show();
}

async function editCustomer(id) {
  try {
    const customer = await apiCall(`Customer/${id}`);
    openCustomerModal(customer);
  } catch (error) {
    showAlert(`Error loading customer: ${error.message}`, 'danger');
  }
}

async function saveCustomer() {
  const form = document.getElementById('customerForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const customer = {
    customerId: parseInt(document.getElementById('customerId').value) || 0,
    firstName: document.getElementById('customerFirstName').value,
    lastName: document.getElementById('customerLastName').value,
    phoneNum: document.getElementById('customerPhone').value,
    address: document.getElementById('customerAddress').value || null
  };
  
  try {
    if (customer.customerId > 0) {
      await apiCall(`Customer/${customer.customerId}`, 'PUT', customer);
      showAlert('Customer updated successfully!');
    } else {
      await apiCall('Customer', 'POST', customer);
      showAlert('Customer created successfully!');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('customerModal')).hide();
    loadCustomers();
  } catch (error) {
    showAlert(`Error saving customer: ${error.message}`, 'danger');
  }
}

function deleteCustomer(id) {
  currentDeleteId = id;
  currentDeleteEntity = 'Customer';
  currentDeleteCallback = async () => {
    try {
      await apiCall(`Customer/${id}`, 'DELETE');
      showAlert('Customer deleted successfully!');
      loadCustomers();
    } catch (error) {
      showAlert(`Error deleting customer: ${error.message}`, 'danger');
    }
  };
  
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

// ==================== PETS ====================
async function loadPets() {
  try {
    const pets = await apiCall('Pet');
    const tbody = document.getElementById('pets-table-body');
    
    if (pets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No pets found</td></tr>';
      return;
    }
    
    tbody.innerHTML = pets.map(pet => `
      <tr>
        <td>${pet.petId}</td>
        <td>${pet.customerId}</td>
        <td>${pet.name}</td>
        <td>${pet.species}</td>
        <td>${pet.breed || '-'}</td>
        <td>${new Date(pet.birthDate).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editPet(${pet.petId})">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deletePet(${pet.petId})">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showAlert(`Error loading pets: ${error.message}`, 'danger');
    document.getElementById('pets-table-body').innerHTML = 
      '<tr><td colspan="7" class="text-center text-danger">Error loading data</td></tr>';
  }
}

function openPetModal(pet = null) {
  const modal = new bootstrap.Modal(document.getElementById('petModal'));
  const form = document.getElementById('petForm');
  form.reset();
  document.getElementById('petId').value = '';
  
  if (pet) {
    document.getElementById('petModalTitle').textContent = 'Edit Pet';
    document.getElementById('petId').value = pet.petId;
    document.getElementById('petCustomerId').value = pet.customerId;
    document.getElementById('petName').value = pet.name;
    document.getElementById('petSpecies').value = pet.species;
    document.getElementById('petBreed').value = pet.breed || '';
    document.getElementById('petBirthDate').value = pet.birthDate.split('T')[0];
    document.getElementById('petNotes').value = pet.notes || '';
  } else {
    document.getElementById('petModalTitle').textContent = 'Add Pet';
  }
  
  modal.show();
}

async function editPet(id) {
  try {
    const pet = await apiCall(`Pet/${id}`);
    openPetModal(pet);
  } catch (error) {
    showAlert(`Error loading pet: ${error.message}`, 'danger');
  }
}

async function savePet() {
  const form = document.getElementById('petForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const pet = {
    petId: parseInt(document.getElementById('petId').value) || 0,
    customerId: parseInt(document.getElementById('petCustomerId').value),
    name: document.getElementById('petName').value,
    species: document.getElementById('petSpecies').value,
    breed: document.getElementById('petBreed').value || null,
    birthDate: document.getElementById('petBirthDate').value,
    notes: document.getElementById('petNotes').value || null
  };
  
  try {
    if (pet.petId > 0) {
      await apiCall(`Pet/${pet.petId}`, 'PUT', pet);
      showAlert('Pet updated successfully!');
    } else {
      await apiCall('Pet', 'POST', pet);
      showAlert('Pet created successfully!');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('petModal')).hide();
    loadPets();
  } catch (error) {
    showAlert(`Error saving pet: ${error.message}`, 'danger');
  }
}

function deletePet(id) {
  currentDeleteId = id;
  currentDeleteEntity = 'Pet';
  currentDeleteCallback = async () => {
    try {
      await apiCall(`Pet/${id}`, 'DELETE');
      showAlert('Pet deleted successfully!');
      loadPets();
    } catch (error) {
      showAlert(`Error deleting pet: ${error.message}`, 'danger');
    }
  };
  
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

// ==================== TRAINERS ====================
async function loadTrainers() {
  try {
    const trainers = await apiCall('Trainer');
    const tbody = document.getElementById('trainers-table-body');
    
    if (trainers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No trainers found</td></tr>';
      return;
    }
    
    tbody.innerHTML = trainers.map(trainer => `
      <tr>
        <td>${trainer.trainerId}</td>
        <td>${trainer.firstName}</td>
        <td>${trainer.lastName}</td>
        <td>${trainer.phoneNum}</td>
        <td>${trainer.speciality || '-'}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editTrainer(${trainer.trainerId})">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteTrainer(${trainer.trainerId})">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showAlert(`Error loading trainers: ${error.message}`, 'danger');
    document.getElementById('trainers-table-body').innerHTML = 
      '<tr><td colspan="6" class="text-center text-danger">Error loading data</td></tr>';
  }
}

function openTrainerModal(trainer = null) {
  const modal = new bootstrap.Modal(document.getElementById('trainerModal'));
  const form = document.getElementById('trainerForm');
  form.reset();
  document.getElementById('trainerId').value = '';
  
  if (trainer) {
    document.getElementById('trainerModalTitle').textContent = 'Edit Trainer';
    document.getElementById('trainerId').value = trainer.trainerId;
    document.getElementById('trainerFirstName').value = trainer.firstName;
    document.getElementById('trainerLastName').value = trainer.lastName;
    document.getElementById('trainerPhone').value = trainer.phoneNum;
    document.getElementById('trainerSpeciality').value = trainer.speciality || '';
  } else {
    document.getElementById('trainerModalTitle').textContent = 'Add Trainer';
  }
  
  modal.show();
}

async function editTrainer(id) {
  try {
    const trainer = await apiCall(`Trainer/${id}`);
    openTrainerModal(trainer);
  } catch (error) {
    showAlert(`Error loading trainer: ${error.message}`, 'danger');
  }
}

async function saveTrainer() {
  const form = document.getElementById('trainerForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const trainer = {
    trainerId: parseInt(document.getElementById('trainerId').value) || 0,
    firstName: document.getElementById('trainerFirstName').value,
    lastName: document.getElementById('trainerLastName').value,
    phoneNum: document.getElementById('trainerPhone').value,
    speciality: document.getElementById('trainerSpeciality').value || null
  };
  
  try {
    if (trainer.trainerId > 0) {
      await apiCall(`Trainer/${trainer.trainerId}`, 'PUT', trainer);
      showAlert('Trainer updated successfully!');
    } else {
      await apiCall('Trainer', 'POST', trainer);
      showAlert('Trainer created successfully!');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('trainerModal')).hide();
    loadTrainers();
  } catch (error) {
    showAlert(`Error saving trainer: ${error.message}`, 'danger');
  }
}

function deleteTrainer(id) {
  currentDeleteId = id;
  currentDeleteEntity = 'Trainer';
  currentDeleteCallback = async () => {
    try {
      await apiCall(`Trainer/${id}`, 'DELETE');
      showAlert('Trainer deleted successfully!');
      loadTrainers();
    } catch (error) {
      showAlert(`Error deleting trainer: ${error.message}`, 'danger');
    }
  };
  
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

// ==================== EMPLOYEES ====================
async function loadEmployees() {
  try {
    const employees = await apiCall('Employee');
    const tbody = document.getElementById('employees-table-body');
    
    if (employees.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No employees found</td></tr>';
      return;
    }
    
    tbody.innerHTML = employees.map(employee => `
      <tr>
        <td>${employee.employeeId}</td>
        <td>${employee.firstName}</td>
        <td>${employee.lastName}</td>
        <td>${employee.email || '-'}</td>
        <td>${employee.phone || '-'}</td>
        <td>${employee.position || '-'}</td>
        <td>${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editEmployee(${employee.employeeId})">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${employee.employeeId})">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showAlert(`Error loading employees: ${error.message}`, 'danger');
    document.getElementById('employees-table-body').innerHTML = 
      '<tr><td colspan="8" class="text-center text-danger">Error loading data</td></tr>';
  }
}

function openEmployeeModal(employee = null) {
  const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
  const form = document.getElementById('employeeForm');
  form.reset();
  document.getElementById('employeeId').value = '';
  
  if (employee) {
    document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
    document.getElementById('employeeId').value = employee.employeeId;
    document.getElementById('employeeFirstName').value = employee.firstName;
    document.getElementById('employeeLastName').value = employee.lastName;
    document.getElementById('employeeEmail').value = employee.email || '';
    document.getElementById('employeePhone').value = employee.phone || '';
    document.getElementById('employeePosition').value = employee.position || '';
    document.getElementById('employeeHireDate').value = employee.hireDate ? employee.hireDate.split('T')[0] : '';
  } else {
    document.getElementById('employeeModalTitle').textContent = 'Add Employee';
  }
  
  modal.show();
}

async function editEmployee(id) {
  try {
    const employee = await apiCall(`Employee/${id}`);
    openEmployeeModal(employee);
  } catch (error) {
    showAlert(`Error loading employee: ${error.message}`, 'danger');
  }
}

async function saveEmployee() {
  const form = document.getElementById('employeeForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const employee = {
    employeeId: parseInt(document.getElementById('employeeId').value) || 0,
    firstName: document.getElementById('employeeFirstName').value,
    lastName: document.getElementById('employeeLastName').value,
    email: document.getElementById('employeeEmail').value || null,
    phone: document.getElementById('employeePhone').value || null,
    position: document.getElementById('employeePosition').value || null,
    hireDate: document.getElementById('employeeHireDate').value || null
  };
  
  try {
    if (employee.employeeId > 0) {
      await apiCall(`Employee/${employee.employeeId}`, 'PUT', employee);
      showAlert('Employee updated successfully!');
    } else {
      await apiCall('Employee', 'POST', employee);
      showAlert('Employee created successfully!');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
    loadEmployees();
  } catch (error) {
    showAlert(`Error saving employee: ${error.message}`, 'danger');
  }
}

function deleteEmployee(id) {
  currentDeleteId = id;
  currentDeleteEntity = 'Employee';
  currentDeleteCallback = async () => {
    try {
      await apiCall(`Employee/${id}`, 'DELETE');
      showAlert('Employee deleted successfully!');
      loadEmployees();
    } catch (error) {
      showAlert(`Error deleting employee: ${error.message}`, 'danger');
    }
  };
  
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

// ==================== CLASSES ====================
async function loadClasses() {
  try {
    const classes = await apiCall('Class');
    const tbody = document.getElementById('classes-table-body');
    
    if (classes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center">No classes found</td></tr>';
      return;
    }
    
    tbody.innerHTML = classes.map(cls => {
      const startTime = formatTimeSpan(cls.startTime);
      const endTime = formatTimeSpan(cls.endTime);
      return `
        <tr>
          <td>${cls.classId}</td>
          <td>${cls.title}</td>
          <td>${cls.classType}</td>
          <td>${cls.trainerId}</td>
          <td>${cls.location}</td>
          <td>${new Date(cls.startDate).toLocaleDateString()}</td>
          <td>${startTime} - ${endTime}</td>
          <td>$${parseFloat(cls.price).toFixed(2)}</td>
          <td>${cls.maxCapacity}</td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="editClass(${cls.classId})">
              <i class="bi bi-pencil"></i> Edit
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteClass(${cls.classId})">
              <i class="bi bi-trash"></i> Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    showAlert(`Error loading classes: ${error.message}`, 'danger');
    document.getElementById('classes-table-body').innerHTML = 
      '<tr><td colspan="10" class="text-center text-danger">Error loading data</td></tr>';
  }
}

function formatTimeSpan(timeSpan) {
  if (typeof timeSpan === 'string') {
    const parts = timeSpan.split(':');
    return `${parts[0]}:${parts[1]}`;
  }
  const hours = Math.floor(timeSpan / 36000000000);
  const minutes = Math.floor((timeSpan % 36000000000) / 600000000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function openClassModal(cls = null) {
  const modal = new bootstrap.Modal(document.getElementById('classModal'));
  const form = document.getElementById('classForm');
  form.reset();
  document.getElementById('classId').value = '';
  
  if (cls) {
    document.getElementById('classModalTitle').textContent = 'Edit Class';
    document.getElementById('classId').value = cls.classId;
    document.getElementById('classTitle').value = cls.title;
    document.getElementById('classType').value = cls.classType;
    document.getElementById('classDescription').value = cls.description;
    document.getElementById('classTrainerId').value = cls.trainerId;
    document.getElementById('classLocation').value = cls.location;
    document.getElementById('classStartDate').value = cls.startDate.split('T')[0];
    document.getElementById('classEndDate').value = cls.endDate.split('T')[0];
    document.getElementById('classCategory').value = cls.category || '';
    document.getElementById('classMaxCapacity').value = cls.maxCapacity;
    document.getElementById('classPrice').value = cls.price;
    
    // Handle time spans
    const startTime = formatTimeSpan(cls.startTime);
    const endTime = formatTimeSpan(cls.endTime);
    document.getElementById('classStartTime').value = startTime;
    document.getElementById('classEndTime').value = endTime;
  } else {
    document.getElementById('classModalTitle').textContent = 'Add Class';
  }
  
  modal.show();
}

async function editClass(id) {
  try {
    const cls = await apiCall(`Class/${id}`);
    openClassModal(cls);
  } catch (error) {
    showAlert(`Error loading class: ${error.message}`, 'danger');
  }
}

async function saveClass() {
  const form = document.getElementById('classForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const startTimeStr = document.getElementById('classStartTime').value;
  const endTimeStr = document.getElementById('classEndTime').value;
  
  const classItem = {
    classId: parseInt(document.getElementById('classId').value) || 0,
    trainerId: parseInt(document.getElementById('classTrainerId').value),
    classType: document.getElementById('classType').value,
    title: document.getElementById('classTitle').value,
    description: document.getElementById('classDescription').value,
    location: document.getElementById('classLocation').value,
    startTime: startTimeStr,
    endTime: endTimeStr,
    startDate: document.getElementById('classStartDate').value,
    endDate: document.getElementById('classEndDate').value,
    maxCapacity: parseInt(document.getElementById('classMaxCapacity').value),
    price: parseFloat(document.getElementById('classPrice').value),
    category: document.getElementById('classCategory').value || null
  };
  
  try {
    if (classItem.classId > 0) {
      await apiCall(`Class/${classItem.classId}`, 'PUT', classItem);
      showAlert('Class updated successfully!');
    } else {
      await apiCall('Class', 'POST', classItem);
      showAlert('Class created successfully!');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('classModal')).hide();
    loadClasses();
  } catch (error) {
    showAlert(`Error saving class: ${error.message}`, 'danger');
  }
}

function deleteClass(id) {
  currentDeleteId = id;
  currentDeleteEntity = 'Class';
  currentDeleteCallback = async () => {
    try {
      await apiCall(`Class/${id}`, 'DELETE');
      showAlert('Class deleted successfully!');
      loadClasses();
    } catch (error) {
      showAlert(`Error deleting class: ${error.message}`, 'danger');
    }
  };
  
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

// ==================== BOOKINGS ====================
async function loadBookings() {
  try {
    const bookings = await apiCall('Booking');
    const tbody = document.getElementById('bookings-table-body');
    
    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center">No bookings found</td></tr>';
      return;
    }
    
    tbody.innerHTML = bookings.map(booking => `
      <tr>
        <td>${booking.bookingId}</td>
        <td>${booking.classId}</td>
        <td>${booking.petId}</td>
        <td>${booking.employeeId}</td>
        <td>${new Date(booking.bookingDate).toLocaleString()}</td>
        <td><span class="badge bg-${getStatusBadgeColor(booking.status)}">${booking.status}</span></td>
        <td><span class="badge bg-${getPaymentBadgeColor(booking.paymentStatus)}">${booking.paymentStatus}</span></td>
        <td>$${parseFloat(booking.amountPaid).toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="editBooking(${booking.bookingId})">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteBooking(${booking.bookingId})">
            <i class="bi bi-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showAlert(`Error loading bookings: ${error.message}`, 'danger');
    document.getElementById('bookings-table-body').innerHTML = 
      '<tr><td colspan="9" class="text-center text-danger">Error loading data</td></tr>';
  }
}

function getStatusBadgeColor(status) {
  const colors = {
    'Confirmed': 'success',
    'Pending': 'warning',
    'Cancelled': 'danger',
    'Completed': 'info'
  };
  return colors[status] || 'secondary';
}

function getPaymentBadgeColor(status) {
  const colors = {
    'Paid': 'success',
    'Pending': 'warning',
    'Refunded': 'danger'
  };
  return colors[status] || 'secondary';
}

function openBookingModal(booking = null) {
  const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
  const form = document.getElementById('bookingForm');
  form.reset();
  document.getElementById('bookingId').value = '';
  
  if (booking) {
    document.getElementById('bookingModalTitle').textContent = 'Edit Booking';
    document.getElementById('bookingId').value = booking.bookingId;
    document.getElementById('bookingClassId').value = booking.classId;
    document.getElementById('bookingPetId').value = booking.petId;
    document.getElementById('bookingEmployeeId').value = booking.employeeId;
    
    // Format datetime for datetime-local input
    const bookingDate = new Date(booking.bookingDate);
    const year = bookingDate.getFullYear();
    const month = String(bookingDate.getMonth() + 1).padStart(2, '0');
    const day = String(bookingDate.getDate()).padStart(2, '0');
    const hours = String(bookingDate.getHours()).padStart(2, '0');
    const minutes = String(bookingDate.getMinutes()).padStart(2, '0');
    document.getElementById('bookingDate').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    document.getElementById('bookingStatus').value = booking.status;
    document.getElementById('bookingPaymentStatus').value = booking.paymentStatus;
    document.getElementById('bookingAmountPaid').value = booking.amountPaid;
  } else {
    document.getElementById('bookingModalTitle').textContent = 'Add Booking';
  }
  
  modal.show();
}

async function editBooking(id) {
  try {
    const booking = await apiCall(`Booking/${id}`);
    openBookingModal(booking);
  } catch (error) {
    showAlert(`Error loading booking: ${error.message}`, 'danger');
  }
}

async function saveBooking() {
  const form = document.getElementById('bookingForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const booking = {
    bookingId: parseInt(document.getElementById('bookingId').value) || 0,
    classId: parseInt(document.getElementById('bookingClassId').value),
    petId: parseInt(document.getElementById('bookingPetId').value),
    employeeId: parseInt(document.getElementById('bookingEmployeeId').value),
    bookingDate: document.getElementById('bookingDate').value,
    status: document.getElementById('bookingStatus').value,
    paymentStatus: document.getElementById('bookingPaymentStatus').value,
    amountPaid: parseFloat(document.getElementById('bookingAmountPaid').value)
  };
  
  try {
    if (booking.bookingId > 0) {
      await apiCall(`Booking/${booking.bookingId}`, 'PUT', booking);
      showAlert('Booking updated successfully!');
    } else {
      await apiCall('Booking', 'POST', booking);
      showAlert('Booking created successfully!');
    }
    
    bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
    loadBookings();
  } catch (error) {
    showAlert(`Error saving booking: ${error.message}`, 'danger');
  }
}

function deleteBooking(id) {
  currentDeleteId = id;
  currentDeleteEntity = 'Booking';
  currentDeleteCallback = async () => {
    try {
      await apiCall(`Booking/${id}`, 'DELETE');
      showAlert('Booking deleted successfully!');
      loadBookings();
    } catch (error) {
      showAlert(`Error deleting booking: ${error.message}`, 'danger');
    }
  };
  
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

// ==================== DELETE MODAL SETUP ====================
function setupDeleteModal() {
  document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (currentDeleteCallback) {
      currentDeleteCallback();
      currentDeleteCallback = null;
      bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
    }
  });
}

