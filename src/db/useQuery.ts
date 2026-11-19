import { addDatabaseChangeListener, useSQLiteContext, type SQLiteBindParams } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { Table } from './queries';

/**
 * Consulta reativa: refaz o SELECT quando alguma das tabelas indicadas muda.
 * Exige o SQLiteProvider aberto com `enableChangeListener: true`.
 */
export function useQuery<T>(sql: string, params: SQLiteBindParams, tables: readonly Table[]): T[] {
  return useQueryState<T>(sql, params, tables).rows;
}

/** Igual a `useQuery`, mais `loaded` (falso até a primeira resposta do banco). */
export function useQueryState<T>(
  sql: string,
  params: SQLiteBindParams,
  tables: readonly Table[],
): { rows: T[]; loaded: boolean } {
  const db = useSQLiteContext();
  const [state, setState] = useState<{ rows: T[]; loaded: boolean }>({ rows: [], loaded: false });
  const paramsKey = JSON.stringify(params);
  const tablesKey = tables.join(',');

  useEffect(() => {
    let alive = true;
    const watched = tablesKey.split(',');
    const args = JSON.parse(paramsKey) as SQLiteBindParams;
    const load = () => {
      db.getAllAsync<T>(sql, args)
        .then((result) => {
          if (alive) setState({ rows: result, loaded: true });
        })
        .catch((error: unknown) => {
          if (__DEV__) console.warn('useQuery', sql, error);
        });
    };
    load();
    // Uma carga de dados dispara um aviso por linha; agrupa os avisos próximos numa consulta só.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub = addDatabaseChangeListener((event) => {
      if (!watched.includes(event.tableName)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(load, 30);
    });
    // O "Já apliquei" do lembrete com o app fechado grava por outra conexão, sem aviso para esta.
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'active') load();
    });
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      sub.remove();
      app.remove();
    };
  }, [db, sql, paramsKey, tablesKey]);

  return state;
}
