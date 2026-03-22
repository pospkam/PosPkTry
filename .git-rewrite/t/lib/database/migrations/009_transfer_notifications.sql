-- Migration: Transfer Notifications System
-- Date: 2025-11-10
-- Purpose: Automated notifications for transfer events

-- ============================================
-- FUNCTION: Notify operator about new transfer booking
-- ============================================

CREATE OR REPLACE FUNCTION notify_operator_new_transfer()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data, priority)
  SELECT 
    p.user_id,
    'transfer_new',
    'Новое бронирование трансфера',
    'Трансфер ' || NEW.booking_reference || ' от ' || NEW.client_name || 
    '. Дата: ' || TO_CHAR(NEW.pickup_datetime, 'DD.MM.YYYY HH24:MI'),
    jsonb_build_object(
      'transferId', NEW.id,
      'bookingReference', NEW.booking_reference,
      'clientName', NEW.client_name,
      'pickupDatetime', NEW.pickup_datetime
    ),
    'high'
  FROM partners p
  WHERE p.id = NEW.operator_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_operator_new_transfer
  AFTER INSERT ON transfers
  FOR EACH ROW
  EXECUTE FUNCTION notify_operator_new_transfer();

-- ============================================
-- FUNCTION: Notify about transfer status change
-- ============================================

CREATE OR REPLACE FUNCTION notify_transfer_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  notification_priority TEXT := 'medium';
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Determine notification content based on new status
    CASE NEW.status
      WHEN 'assigned' THEN
        notification_title := 'Трансфер назначен';
        notification_message := 'Ваш трансфер ' || NEW.booking_reference || ' был назначен водителю';
        notification_priority := 'high';
      WHEN 'confirmed' THEN
        notification_title := 'Трансфер подтверждён';
        notification_message := 'Трансфер ' || NEW.booking_reference || ' подтверждён';
      WHEN 'in_progress' THEN
        notification_title := 'Трансфер в пути';
        notification_message := 'Водитель начал выполнение трансфера ' || NEW.booking_reference;
        notification_priority := 'high';
      WHEN 'completed' THEN
        notification_title := 'Трансфер завершён';
        notification_message := 'Трансфер ' || NEW.booking_reference || ' успешно завершён. Оцените поездку!';
      WHEN 'cancelled' THEN
        notification_title := 'Трансфер отменён';
        notification_message := 'Трансфер ' || NEW.booking_reference || ' был отменён';
        notification_priority := 'high';
      WHEN 'delayed' THEN
        notification_title := 'Трансфер задерживается';
        notification_message := 'Трансфер ' || NEW.booking_reference || ' задерживается';
        notification_priority := 'high';
      ELSE
        RETURN NEW;
    END CASE;
    
    -- Notify customer if user_id exists
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, data, priority)
      VALUES (
        NEW.user_id,
        'transfer_status',
        notification_title,
        notification_message,
        jsonb_build_object(
          'transferId', NEW.id,
          'bookingReference', NEW.booking_reference,
          'oldStatus', OLD.status,
          'newStatus', NEW.status
        ),
        notification_priority
      );
    END IF;
    
    -- Notify operator about status change
    INSERT INTO notifications (user_id, type, title, message, data, priority)
    SELECT 
      p.user_id,
      'transfer_status_operator',
      'Статус трансфера изменён',
      'Трансфер ' || NEW.booking_reference || ': ' || OLD.status || ' → ' || NEW.status,
      jsonb_build_object(
        'transferId', NEW.id,
        'bookingReference', NEW.booking_reference,
        'clientName', NEW.client_name,
        'oldStatus', OLD.status,
        'newStatus', NEW.status
      ),
      CASE 
        WHEN NEW.status IN ('cancelled', 'delayed') THEN 'high'
        ELSE 'medium'
      END
    FROM partners p
    WHERE p.id = NEW.operator_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_transfer_status_change
  AFTER UPDATE ON transfers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_transfer_status_change();

-- ============================================
-- FUNCTION: Notify about payment status change
-- ============================================

CREATE OR REPLACE FUNCTION notify_transfer_payment_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Only trigger if payment status actually changed
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    
    CASE NEW.payment_status
      WHEN 'paid' THEN
        notification_title := 'Оплата получена';
        notification_message := 'Оплата трансфера ' || NEW.booking_reference || ' подтверждена';
      WHEN 'refunded' THEN
        notification_title := 'Возврат средств';
        notification_message := 'Средства за трансфер ' || NEW.booking_reference || ' возвращены';
      WHEN 'partially_refunded' THEN
        notification_title := 'Частичный возврат';
        notification_message := 'Частичный возврат за трансфер ' || NEW.booking_reference || ' обработан';
      ELSE
        RETURN NEW;
    END CASE;
    
    -- Notify customer
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, data, priority)
      VALUES (
        NEW.user_id,
        'transfer_payment',
        notification_title,
        notification_message,
        jsonb_build_object(
          'transferId', NEW.id,
          'bookingReference', NEW.booking_reference,
          'paymentStatus', NEW.payment_status,
          'amount', NEW.price
        ),
        'medium'
      );
    END IF;
    
    -- Notify operator
    IF NEW.payment_status = 'paid' THEN
      INSERT INTO notifications (user_id, type, title, message, data, priority)
      SELECT 
        p.user_id,
        'transfer_payment_operator',
        'Оплата получена',
        'Получена оплата за трансфер ' || NEW.booking_reference || ': ' || NEW.price || ' ' || NEW.currency,
        jsonb_build_object(
          'transferId', NEW.id,
          'bookingReference', NEW.booking_reference,
          'amount', NEW.price,
          'currency', NEW.currency
        ),
        'medium'
      FROM partners p
      WHERE p.id = NEW.operator_id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_transfer_payment_change
  AFTER UPDATE ON transfers
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION notify_transfer_payment_change();

-- ============================================
-- FUNCTION: Notify about new transfer review
-- ============================================

CREATE OR REPLACE FUNCTION notify_operator_new_transfer_review()
RETURNS TRIGGER AS $$
DECLARE
  transfer_ref TEXT;
  operator_user_id UUID;
BEGIN
  -- Get transfer booking reference and operator user_id
  SELECT 
    t.booking_reference,
    p.user_id
  INTO 
    transfer_ref,
    operator_user_id
  FROM transfers t
  JOIN partners p ON t.operator_id = p.id
  WHERE t.id = NEW.transfer_id;
  
  -- Notify operator
  IF operator_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, data, priority)
    VALUES (
      operator_user_id,
      'transfer_review',
      CASE 
        WHEN NEW.rating >= 4 THEN 'Новый положительный отзыв'
        WHEN NEW.rating = 3 THEN 'Новый отзыв'
        ELSE 'Новый негативный отзыв'
      END,
      'Получен отзыв на трансфер ' || transfer_ref || '. Оценка: ' || NEW.rating || '/5',
      jsonb_build_object(
        'reviewId', NEW.id,
        'transferId', NEW.transfer_id,
        'bookingReference', transfer_ref,
        'rating', NEW.rating
      ),
      CASE 
        WHEN NEW.rating <= 2 THEN 'high'
        ELSE 'medium'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_operator_new_transfer_review
  AFTER INSERT ON transfer_reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_operator_new_transfer_review();

-- ============================================
-- FUNCTION: Notify about expiring documents
-- ============================================

CREATE OR REPLACE FUNCTION notify_expiring_documents()
RETURNS void AS $$
BEGIN
  -- Notify about expiring vehicle documents (30 days)
  INSERT INTO notifications (user_id, type, title, message, data, priority)
  SELECT DISTINCT
    p.user_id,
    'document_expiring',
    'Истекает срок документа',
    'Документ ' || vd.name || ' для ' || v.name || ' (' || v.license_plate || ') истекает ' || 
    TO_CHAR(vd.expiry_date, 'DD.MM.YYYY'),
    jsonb_build_object(
      'documentId', vd.id,
      'vehicleId', v.id,
      'documentType', vd.type,
      'expiryDate', vd.expiry_date
    ),
    CASE 
      WHEN vd.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'high'
      ELSE 'medium'
    END
  FROM vehicle_documents vd
  JOIN vehicles v ON vd.vehicle_id = v.id
  JOIN partners p ON v.operator_id = p.id
  WHERE vd.expiry_date IS NOT NULL
  AND vd.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
  AND vd.expiry_date > CURRENT_DATE
  AND vd.status = 'expiring'
  AND p.category = 'transfer';
  
  -- Notify about expiring driver documents (30 days)
  INSERT INTO notifications (user_id, type, title, message, data, priority)
  SELECT DISTINCT
    p.user_id,
    'document_expiring',
    'Истекает срок документа водителя',
    'Документ ' || dd.name || ' водителя ' || d.first_name || ' ' || d.last_name || 
    ' истекает ' || TO_CHAR(dd.expiry_date, 'DD.MM.YYYY'),
    jsonb_build_object(
      'documentId', dd.id,
      'driverId', d.id,
      'documentType', dd.type,
      'expiryDate', dd.expiry_date
    ),
    CASE 
      WHEN dd.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'high'
      ELSE 'medium'
    END
  FROM driver_documents dd
  JOIN drivers d ON dd.driver_id = d.id
  JOIN partners p ON d.operator_id = p.id
  WHERE dd.expiry_date IS NOT NULL
  AND dd.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
  AND dd.expiry_date > CURRENT_DATE
  AND dd.status = 'expiring'
  AND p.category = 'transfer';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to check expiring documents daily
-- Note: This requires pg_cron extension or external scheduler
-- For now, this function can be called manually or via cron job

COMMENT ON FUNCTION notify_expiring_documents() IS 'Check and notify about expiring documents (run daily)';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION notify_operator_new_transfer() IS 'Automatically notify operator when new transfer is booked';
COMMENT ON FUNCTION notify_transfer_status_change() IS 'Notify customer and operator about transfer status changes';
COMMENT ON FUNCTION notify_transfer_payment_change() IS 'Notify about payment status changes';
COMMENT ON FUNCTION notify_operator_new_transfer_review() IS 'Notify operator about new transfer reviews';
