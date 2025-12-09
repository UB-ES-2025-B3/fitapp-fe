describe('Gestión Avanzada de Rutas', () => {
  // Ignorar errores de Mapbox
  Cypress.on('uncaught:exception', (err, runnable) => {
    return false;
  });

  beforeEach(() => {
    // 1. GENERAR DATOS ÚNICOS PARA CADA TEST INDIVIDUAL
    // Al ponerlo aquí dentro, cada 'it' tendrá un usuario distinto
    const RANDOM = Date.now();
    const EMAIL = `route_mgr_${RANDOM}@test.com`;
    const PASS = 'Pass123!';

    // 2. Registro
    cy.visit('/register');
    cy.get('#email').type(EMAIL);
    cy.get('#password').type(PASS);
    cy.get('#confirmPassword').type(PASS);
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.get('.submit-btn').click();

    // 3. Esperar redirección
    cy.url({ timeout: 20000 }).should('not.include', '/register');

    // 4. Login de seguridad (si es necesario)
    cy.get('body').then(($body) => {
        if ($body.find('input#email').length > 0) {
            // Usamos las variables locales EMAIL/PASS, no USER_EMAIL
            cy.get('#email').type(EMAIL);
            cy.get('#password').type(PASS);
            cy.get('.submit-btn').click();
        }
    });

    // 5. ONBOARDING
    cy.get('body').then(($body) => {
        if ($body.find('#firstName').length > 0) {
            cy.get('#firstName').type('Test');
            cy.get('#lastName').type('User');
            cy.get('#birthDate').type('1990-01-01');
            cy.get('#gender').select('male');
            cy.get('#height').type('175');
            cy.get('#weight').type('70');
            cy.get('#goalKcal').clear().type('2000');
            cy.get('.submit-btn').click();
            cy.wait(1000);
        }
    });

    // 6. Crear una ruta
    cy.visit('/routes/new');
    cy.get('input[placeholder*="Nombre"]').type('Ruta Parque Central');
    
    // Espera para Mapbox
    cy.wait(4000);

    // Hacemos clic en el CANVAS, no en el div contenedor
    // Buscamos 'canvas' dentro de '.map-area' (o la clase de Mapbox)
    cy.get('.mapboxgl-canvas, canvas').first().click(300, 200, { force: true }); // Punto Inicio
    
    // Pequeña pausa para que la app registre el primer punto
    cy.wait(1000);

    // Cambiar a modo Fin
    cy.get('input[value="end"]').check({force: true});
    
    // Punto Final (en coordenadas distintas)
    cy.get('.mapboxgl-canvas, canvas').first().click(500, 300, { force: true }); // Punto Fin
    
    // Otra pausa para asegurar que se dibuja la línea
    cy.wait(1000);
    
    cy.contains('button', 'Guardar ruta').click();
    
    // Verificar redirección
    cy.url().should('include', '/routes');
    cy.contains('Ruta Parque Central').should('be.visible');
  });

  it('Filtrado de rutas por buscador', () => {
    cy.visit('/routes');
    
    cy.get('.search-input').should('be.visible').type('Parque');
    cy.get('.routes-list').should('contain', 'Ruta Parque Central');
    
    cy.get('.search-input').clear().type('Ruta Inexistente XYZ');
    // Verificar que no hay resultados
    cy.get('body').should('contain', 'No'); 
  });

  it('Navegación a Editar Ruta', () => {
    cy.visit('/routes');
    cy.contains('.routes-list li', 'Ruta Parque Central').within(() => {
        cy.contains('Editar').click();
    });
    
    cy.url().should('include', '/edit');
    cy.contains('h1', 'Editar ruta');
  });
});