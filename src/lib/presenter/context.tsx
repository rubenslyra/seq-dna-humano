import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import scriptData from './script.json';

// ID fixo para manter o Tablet e o PC na mesma sala P2P sem servidor de sinalização customizado
const ROOM_ID = 'seq-dna-humano-sync-v1';

export interface PresenterContextValue {
  currentSlide: number;
  nextSlide: () => void;
  prevSlide: () => void;
  scriptData: typeof scriptData;
  isConnected: boolean;
  peerId: string | null;
}

export const PresenterContext = createContext<PresenterContextValue | null>(null);

export function PresenterProvider({ children }: { children: React.ReactNode }) {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [peerId, setPeerId] = useState<string | null>(null);

  // Ref para evitar stale closures nos handlers de evento do PeerJS
  const currentSlideRef = useRef(currentSlide);
  useEffect(() => { currentSlideRef.current = currentSlide; }, [currentSlide]);

  useEffect(() => {
    // Inicializa o Peer com o ID fixo da sala
    const newPeer = new Peer(ROOM_ID, {
      debug: 2,
    });

    newPeer.on('open', (id) => {
      setPeerId(id);
      console.log('[P2P] Peer aberto com ID:', id);

      // Se este dispositivo NÃO é o host (ou seja, o ID foi gerado automaticamente porque o ROOM_ID já estava em uso),
      // ele tenta conectar ao host. Mas como usamos ID fixo, o primeiro a abrir vira o host.
      // O segundo receberá erro no open ou precisará de lógica de fallback.
      // Para simplificar conforme spec: tentamos conectar ao ROOM_ID explicitamente se não formos o próprio ROOM_ID
      if (id !== ROOM_ID) {
        const conn = newPeer.connect(ROOM_ID);
        setupConnection(conn);
      }
    });

    // Se for o host (PC), escuta conexões entrantes (Tablet)
    newPeer.on('connection', (incomingConn) => {
      console.log('[P2P] Conexão recebida de:', incomingConn.peer);
      setupConnection(incomingConn);
    });

    newPeer.on('error', (err) => {
      console.error('[P2P] Erro:', err);
      // Se o ID fixo já estiver em uso, gera um ID aleatório e conecta como cliente
      if (err.type === 'unavailable-id') {
        console.log('[P2P] ID da sala em uso, reconectando como cliente...');
        const clientPeer = new Peer();
        clientPeer.on('open', () => {
          const conn = clientPeer.connect(ROOM_ID);
          setupConnection(conn);
        });
        setPeer(clientPeer);
      }
    });

    function setupConnection(conn: DataConnection) {
      conn.on('open', () => {
        setConnection(conn);
        setIsConnected(true);
        console.log('[P2P] Conectado a:', conn.peer);
      });

      conn.on('data', (data: any) => {
        if (data.action === 'NEXT_SLIDE') {
          setCurrentSlide(s => Math.min(s + 1, scriptData.length - 1));
        }
        if (data.action === 'PREV_SLIDE') {
          setCurrentSlide(s => Math.max(s - 1, 0));
        }
        if (data.action === 'SYNC_SLIDE' && typeof data.slide === 'number') {
          setCurrentSlide(data.slide);
        }
      });

      conn.on('close', () => {
        setIsConnected(false);
        setConnection(null);
        console.log('[P2P] Conexão fechada');
      });
    }

    setPeer(newPeer);
    return () => {
      newPeer.destroy();
    };
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide(s => {
      const next = Math.min(s + 1, scriptData.length - 1);
      connection?.send({ action: 'SYNC_SLIDE', slide: next });
      return next;
    });
  }, [connection]);

  const prevSlide = useCallback(() => {
    setCurrentSlide(s => {
      const prev = Math.max(s - 1, 0);
      connection?.send({ action: 'SYNC_SLIDE', slide: prev });
      return prev;
    });
  }, [connection]);

  return (
    <PresenterContext.Provider value={{ currentSlide, nextSlide, prevSlide, scriptData, isConnected, peerId }}>
      {children}
    </PresenterContext.Provider>
  );
}

export const usePresenter = () => {
  const context = useContext(PresenterContext);
  if (!context) throw new Error('usePresenter deve ser usado dentro de PresenterProvider');
  return context;
};

/**
 * Retorna o texto do roteiro para um slide específico (1-indexed).
 * Usado pelo PresenterAssistant para groundear respostas no conteúdo curado.
 */
export function getSlideScript(slideNumber: number): string | null {
  const entry = scriptData[slideNumber - 1];
  if (!entry) return null;
  return [entry.title, ...entry.paragraphs].join('\n\n');
}

/**
 * Ignora atalhos de teclado do deck quando o foco está em campos editáveis
 * ou quando o assistente do apresentador está aberto (para evitar conflitos).
 */
export function ignoreDeckKeys(target: EventTarget | null, assistantOpen: boolean): boolean {
  if (assistantOpen) return true;
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}