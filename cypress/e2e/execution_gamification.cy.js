describe('Ejecución de Actividad y Gamificación', () => {
  const RANDOM = Math.floor(Math.random() * 10000);
  const EMAIL = `runner_${RANDOM}@test.com`;
  const PASS = 'Pass123!';

  beforeEach(() => {
    // 1. REGISTRO NUEVO
    cy.visit('/register');
    cy.get('#email').type(EMAIL);
    cy.get('#password').type(PASS);
    cy.get('#confirmPassword').type(PASS);
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.get('.submit-btn').click();

    // 2. Esperar salida del registro
    cy.url({ timeout: 20000 }).should('not.include', '/register');

    // 3. Manejo de Login (Safety check)
    cy.get('body').then(($body) => {
      if ($body.find('input#email').length > 0) {
        cy.get('#email').type(EMAIL);
        cy.get('#password').type(PASS);
        cy.get('.submit-btn').click();
      }
    });

    // 4. ONBOARDING
    // Rellenamos todos los datos obligatorios, incluido goalKcal
    cy.get('body').then(($body) => {
      if ($body.find('#firstName').length > 0) {
        cy.get('#firstName').type('Runner');
        cy.get('#lastName').type('Test');
        cy.get('#birthDate').type('1990-01-01');
        cy.get('#gender').select('male'); 
        cy.get('#height').type('175');
        cy.get('#weight').type('70');
        
        // Campo obligatorio para que deje avanzar
        cy.get('#goalKcal').clear().type('2000'); 
        
        cy.get('.submit-btn').click();
        
        // Esperamos a que termine el guardado del perfil
        cy.wait(1000); 
      }
    });

    // 5. CREAR UNA RUTA (Prerrequisito para poder ejecutar)
    // Forzamos la navegación a crear ruta una vez logueados/onboarded
    cy.visit('/routes/new');
    
    cy.get('input[placeholder*="Nombre"]').type('Ruta Gamification Test');

    // Esperar a que el mapa cargue antes de hacer clic
    cy.wait(2000);
    
    // Marcar puntos en el mapa (Inicio y Fin)
    // Nos aseguramos de que .map-area sea el selector correcto de nuestro contenedor de mapa
    cy.get('.map-area').click(200, 200); // Click inicio
    cy.get('input[value="end"]').check({force: true}); // Cambiar radio a Fin
    cy.get('.map-area').click(300, 300); // Click fin
    
    cy.contains('button', 'Guardar ruta').click();
    
    // Verificar que se guardó y redirigió al listado
    cy.url().should('include', '/routes');
    cy.contains('Ruta Gamification Test').should('be.visible');
  });

  it('Flujo: Iniciar -> Pausar -> Finalizar -> Ver Modal Puntos', () => {
    // 1. Seleccionar la ruta creada
    cy.contains('.routes-list li', 'Ruta Gamification Test').within(() => {
        cy.contains('Ver').click();
    });
    
    // 2. Iniciar
    cy.contains('button', 'Iniciar Ejecución').click();
    
    // Modal de selección de actividad
    cy.get('.start-modal-card').should('be.visible');
    cy.get('select#activityType').select('RUNNING_MODERATE');
    cy.contains('button', 'Confirmar e Iniciar').click();

    // 3. Pantalla ActiveRun
    cy.url().should('include', '/run/active');
    cy.get('.timer-display').should('be.visible');

    // 4. Pausar y Reanudar (Probar controles)
    cy.get('.btn-pause').click();
    cy.contains('PAUSADO').should('be.visible');
    cy.wait(500); // Pequeña pausa visual
    cy.get('.btn-resume').click();
    cy.contains('EN CURSO').should('be.visible');

    cy.wait(2000); // Simular algo de tiempo en ejecución

    // 5. Finalizar
    cy.get('.btn-finish').click();
    
    // Modal de confirmación (si hay input de notas)
    cy.get('body').then(($body) => {
        if ($body.find('textarea').length > 0) {
            cy.get('textarea').type('Test automático con Cypress');
        }
    });
    // Clic en el botón final del modal (ajusta el texto si es 'Guardar', 'Confirmar', etc.)
    // Esto es mucho más seguro que buscar por clases CSS
    cy.contains('button', 'Guardar y Finalizar').click();

    // 6. VERIFICACIÓN GAMIFICACIÓN (US-14)
    // El modal de puntos debe aparecer ahora
    cy.get('.points-modal-card').should('be.visible');
    cy.get('.points-icon').should('contain', '🏆');
    
    // Verificamos que aparezca la palabra "Puntos" y algún número
    cy.get('.points-score').should('contain', 'Puntos');
    
    // 7. Volver a Inicio
    cy.contains('button', 'Volver a Inicio').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });
});
