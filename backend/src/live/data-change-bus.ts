import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

/**
 * Barramento em memória de avisos de mudança de dados no backend.
 * Decisão de 2026-11-24: processo único, sem Redis/LISTEN/NOTIFY.
 */
@Injectable()
export class DataChangeBus {
  private readonly changeSubject = new Subject<void>();

  /**
   * Notifica todos os ouvintes de que houve alteração de dados.
   *
   * @example bus.announceChange();
   */
  announceChange(): void {
    this.changeSubject.next();
  }

  /**
   * Retorna um Observable com as notificações de mudança.
   *
   * @example const sub = bus.changes().subscribe(() => reload());
   */
  changes(): Observable<void> {
    return this.changeSubject;
  }
}
