import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { OnboardingView } from './views/OnboardingView';
import { MainShell } from './views/MainShell';
import { CoursePlayerView } from './views/CoursePlayerView';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <div className="antialiased selection:bg-primary selection:text-white">
      <BrowserRouter>
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<LoginView />} />
          <Route path="/register" element={<RegisterView />} />
          
          {/* Rota de Onboarding (protegida, mas só acessível se profile incompleto) */}
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute requireOnboarding={true}>
                <OnboardingView />
              </ProtectedRoute>
            } 
          />
          
          {/* Rotas da Aplicação Principal */}
          <Route 
            path="/app" 
            element={
              <ProtectedRoute>
                <MainShell />
              </ProtectedRoute>
            }
          >
            {/* Redireciona /app para /app/courses */}
            <Route index element={<Navigate to="/app/courses" replace />} />
          </Route>
          
          {/* Rotas específicas dentro do app */}
          <Route 
            path="/app/courses" 
            element={
              <ProtectedRoute>
                <MainShell />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/app/community" 
            element={
              <ProtectedRoute>
                <MainShell />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/app/admin" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <MainShell />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/app/support" 
            element={
              <ProtectedRoute>
                <MainShell />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/app/profile" 
            element={
              <ProtectedRoute>
                <MainShell />
              </ProtectedRoute>
            } 
          />
          
          {/* Rota do Player de Curso */}
          <Route 
            path="/app/course/:courseId" 
            element={
              <ProtectedRoute>
                <CoursePlayerView />
              </ProtectedRoute>
            } 
          />
          
          {/* Rota do Player com aula específica */}
          <Route 
            path="/app/course/:courseId/lesson/:lessonId" 
            element={
              <ProtectedRoute>
                <CoursePlayerView />
              </ProtectedRoute>
            } 
          />
          
          {/* Redireciona / para /app/courses se autenticado, senão /login */}
          <Route path="/" element={<Navigate to="/app/courses" replace />} />
          
          {/* Fallback - 404 */}
          <Route path="*" element={<Navigate to="/app/courses" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;