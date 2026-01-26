
import React, { useState } from 'react';
import { 
  Database, 
  Server, 
  Terminal, 
  ShieldCheck, 
  Globe, 
  Layers,
  Code
} from 'lucide-react';

const RoadmapView: React.FC = () => {
  const [activeSection, setActiveSection] = useState(0);

  const steps = [
    {
      title: "1. Проектирование Базы Данных (PostgreSQL)",
      icon: <Database className="text-blue-400" />,
      content: `Для начала спроектируем основные таблицы. Нам нужны пользователи, тайтлы (кэш), и таблица связей (Track List).`,
      sql: `-- Схема базы данных
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE manga_titles (
    id VARCHAR(100) PRIMARY KEY, -- ID из внешнего API (AniList ID)
    title VARCHAR(255) NOT NULL,
    cover_url TEXT,
    total_chapters INTEGER
);

CREATE TABLE user_manga_list (
    user_id INTEGER REFERENCES users(id),
    manga_id VARCHAR(100) REFERENCES manga_titles(id),
    status VARCHAR(20) CHECK (status IN ('READING', 'PLAN_TO_READ', 'COMPLETED', 'DROPPED')),
    current_chapter INTEGER DEFAULT 0,
    score INTEGER CHECK (score BETWEEN 1 AND 10),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, manga_id)
);`
    },
    {
      title: "2. Настройка Spring Boot & Security (JWT)",
      icon: <ShieldCheck className="text-emerald-400" />,
      content: "Используем Spring Security и JJWT для авторизации. Нам нужен Filter, который перехватывает запросы и проверяет токен.",
      java: `// Пример SecurityConfig.java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf().disable()
            .authorizeHttpRequests()
            .requestMatchers("/api/auth/**").permitAll()
            .anyRequest().authenticated()
            .and()
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS);
        
        http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}`
    },
    {
      title: "3. Интеграция с AniList (GraphQL)",
      icon: <Globe className="text-purple-400" />,
      content: "В этой демо-версии мы уже подключили AniList GraphQL через fetch. В Spring Boot можно использовать RestTemplate или WebClient.",
      java: `// Пример Java GraphQL Client
@Service
public class AniListClient {
    private final WebClient webClient = WebClient.create("https://graphql.anilist.co");

    public Mono<String> search(String query) {
        String graphQLQuery = "{ \"query\": \"query ($s: String) { Page { media(search: $s, type: MANGA) { id title { english } } } }\", \"variables\": { \"s\": \"" + query + "\" } }";
        return webClient.post()
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(graphQLQuery)
            .retrieve()
            .bodyToMono(String.class);
    }
}`
    },
    {
      title: "4. Уведомления и WebSocket",
      icon: <Server className="text-orange-400" />,
      content: "Используем Spring Scheduling (@Scheduled) для периодической проверки обновлений и WebSocket для real-time уведомлений.",
      java: `// Фоновая задача
@Component
public class NotificationTask {
    @Scheduled(cron = "0 0 * * * *") // Каждый час
    public void checkNewChapters() {
        List<String> followedIds = repository.findAllMangaIds();
        // Запрос к API -> Сравнение с нашей БД -> Отправка уведомления
    }
}`
    }
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-1/3 space-y-4">
        {steps.map((step, idx) => (
          <button
            key={idx}
            onClick={() => setActiveSection(idx)}
            className={`w-full text-left p-6 rounded-2xl border transition-all ${
              activeSection === idx 
                ? 'bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-500/10' 
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              {step.icon}
              <h4 className={`font-bold ${activeSection === idx ? 'text-indigo-400' : 'text-slate-200'}`}>
                {step.title}
              </h4>
            </div>
            <p className="text-sm text-slate-400 line-clamp-2">{step.content}</p>
          </button>
        ))}
      </div>

      <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
             <Code className="text-indigo-400" />
          </div>
          <h3 className="text-2xl font-bold">{steps[activeSection].title}</h3>
        </div>
        
        <p className="text-slate-400 mb-8 leading-relaxed">
          {steps[activeSection].content}
        </p>

        <div className="relative">
          <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-950 px-2 py-1 rounded">
            {steps[activeSection].sql ? 'SQL Schema' : 'Java (Spring Boot)'}
          </div>
          <pre className="bg-slate-950 p-6 rounded-2xl border border-slate-800 overflow-x-auto font-mono text-sm leading-relaxed text-indigo-300">
            <code>{steps[activeSection].sql || steps[activeSection].java}</code>
          </pre>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Key Dependencies</h5>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-mono text-slate-300">spring-boot-starter-data-jpa</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-mono text-slate-300">spring-boot-starter-security</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-mono text-slate-300">jjwt-api</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-[10px] font-mono text-slate-300">postgresql</span>
            </div>
          </div>
          <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Pro Mentor Tip</h5>
            <p className="text-[11px] text-slate-400 italic">
              "Для кэширования внешних API (например, AniList) используй Redis. Это спасет тебя от rate-limits и ускорит загрузку страниц для твоих пользователей."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadmapView;
