# Flow Viewer (Angular)

Aplicación frontend Angular para visualización de flujos de trabajo.

## Tecnologías
- **Angular 17+** (standalone components)
- **TypeScript**
- **Tailwind CSS**
- **Signal-based reactivity**

## Arquitectura

```
flow-viewer/
├── src/
│   ├── app/
│   │   ├── app.component.ts       # Root component + iframe message handler
│   │   ├── app.component.html     # Layout con nav + router-outlet
│   │   ├── app.component.css      # Estilos globales (incluye .embedded)
│   │   ├── core/
│   │   │   ├── services/
│   │   │   │   ├── theme.service.ts    # Gestión de temas dark/light
│   │   │   │   ├── orchestrator.service.ts  # API calls al orchestrator
│   │   │   │   ├── control-center.service.ts  # API calls al control-center
│   │   │   │   └── flow-sse.service.ts   # SSE para eventos en tiempo real
│   │   │   └── models/
│   │   ├── features/
│   │   │   └── flow-dashboard/
│   │   │       ├── flow-dashboard.component.ts  # Dashboard principal
│   │   │       └── flow-dashboard.component.html
│   │   └── shared/
│   │       └── searchable-select/
│   │           ├── searchable-select.component.ts  # Componente reutilizable
│   │           └── searchable-select.component.html
│   └── styles.css              # Tailwind + variables CSS
├── proxy.conf.json            # Proxy para desarrollo
└── README.md
```

## AppComponent (Root)

Maneja:
- Navbar con toggle de tema
- Layout base con `router-outlet`
- **Comunicación iframe** (postMessage)
  - Escucha: THEME_CHANGE, EMBEDDED, AUTH_TOKEN
  - Envia: IFRAME_READY al portal padre
  - Modo embedded: oculta navbar y ajusta estilos

### Modo Embedded
Cuando recibe `{type: 'EMBEDDED', embedded: true}`:
- Agrega clase `embedded` al `body`
- Navbar desaparece (CSS: `body.embedded .app-navbar { display: none }`)

## FlowDashboardComponent

Dashboard principal que muestra:
- Lista de flujos/procesos
- Estado en tiempo real (SSE)
- Acciones de inicio/pausa

## Services

| Service | Props | Uso |
|---------|-------|-----|
| ThemeService | theme signal, toggle() | Gestión dark/light |
| FlowSseService | EventSource | Eventos SSE en tiempo real |
| OrchestratorService | HttpClient | API orchestrator |
| ControlCenterService | HttpClient | API control-center |
