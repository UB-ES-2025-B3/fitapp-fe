describe('FitApp Happy Path Completo', () => {
  
  const RANDOM_ID = Math.floor(Math.random() * 1000000);
  const USER_EMAIL = `cypress_user_${RANDOM_ID}@test.com`;
  const USER_PASS = 'Password123!'; 

  it('Flujo: Registro -> Onboarding (POST) -> Home -> Crear Ruta', () => {
    
    // 1. REGISTRO
    cy.visit('/register');
    cy.get('#email').type(USER_EMAIL);
    cy.get('#password').type(USER_PASS);
    cy.get('#confirmPassword').type(USER_PASS);
    cy.get('input[type="checkbox"]').check({ force: true }); 
    
    cy.intercept('POST', '**/api/v1/auth/register').as('registerRequest');
    cy.get('.submit-btn').click();
    cy.wait('@registerRequest').its('response.statusCode').should('be.oneOf', [200, 201]);

    // 2. ONBOARDING
    cy.url({ timeout: 20000 }).should('include', '/onboarding/profile');
    
    cy.get('#firstName').should('be.visible').type('Cypress');
    cy.get('#lastName').type('User');
    cy.get('#birthDate').type('1995-05-05');
    cy.get('#gender').select('male'); 
    cy.get('#height').type('175');
    cy.get('#weight').type('70');
    cy.get('#goalKcal').clear().type('2000');
    
    // Volvemos a POST porque el PUT dio 404
    cy.intercept('POST', '**/api/v1/profiles/me').as('createProfile');
    
    cy.get('.submit-btn').contains(/Guardar|Crear/i).click();
    
    // Debugging profundo si falla
    cy.wait('@createProfile').then((interception) => {
        if (interception.response.statusCode >= 400) {
            throw new Error(`ERROR BACKEND: ${JSON.stringify(interception.response.body)}`);
        }
    });

    // 3. HOME
    cy.url({ timeout: 20000 }).should('eq', Cypress.config().baseUrl + '/');
    cy.get('.hero-title', { timeout: 10000 }).should('be.visible');

    // 4. RUTA
    cy.visit('/routes/new');
    cy.get('input[placeholder*="Nombre"]').type(`Ruta ${RANDOM_ID}`);
    cy.contains('button', 'Guardar ruta').click();
    cy.get('.error-box').should('contain', 'Debes marcar Inicio y Fin');
  });
});