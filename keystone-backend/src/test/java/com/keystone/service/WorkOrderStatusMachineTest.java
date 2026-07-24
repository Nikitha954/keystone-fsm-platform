package com.keystone.service;

import com.keystone.domain.enums.WorkOrderStatus;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class WorkOrderStatusMachineTest {

    @Test void new_canGoTo_assigned()    { assertThat(WorkOrderStatus.NEW.canTransitionTo(WorkOrderStatus.ASSIGNED)).isTrue(); }
    @Test void new_canGoTo_cancelled()  { assertThat(WorkOrderStatus.NEW.canTransitionTo(WorkOrderStatus.CANCELLED)).isTrue(); }
    @Test void new_cannotGoTo_inProgress() { assertThat(WorkOrderStatus.NEW.canTransitionTo(WorkOrderStatus.IN_PROGRESS)).isFalse(); }
    @Test void new_cannotGoTo_completed()  { assertThat(WorkOrderStatus.NEW.canTransitionTo(WorkOrderStatus.COMPLETED)).isFalse(); }

    @Test void assigned_canGoTo_inProgress() { assertThat(WorkOrderStatus.ASSIGNED.canTransitionTo(WorkOrderStatus.IN_PROGRESS)).isTrue(); }
    @Test void assigned_canGoTo_cancelled()  { assertThat(WorkOrderStatus.ASSIGNED.canTransitionTo(WorkOrderStatus.CANCELLED)).isTrue(); }
    @Test void assigned_cannotGoTo_completed() { assertThat(WorkOrderStatus.ASSIGNED.canTransitionTo(WorkOrderStatus.COMPLETED)).isFalse(); }

    @Test void inProgress_canGoTo_onHold()    { assertThat(WorkOrderStatus.IN_PROGRESS.canTransitionTo(WorkOrderStatus.ON_HOLD)).isTrue(); }
    @Test void inProgress_canGoTo_completed() { assertThat(WorkOrderStatus.IN_PROGRESS.canTransitionTo(WorkOrderStatus.COMPLETED)).isTrue(); }
    @Test void inProgress_cannotGoTo_new()    { assertThat(WorkOrderStatus.IN_PROGRESS.canTransitionTo(WorkOrderStatus.NEW)).isFalse(); }

    @Test void onHold_canGoTo_inProgress() { assertThat(WorkOrderStatus.ON_HOLD.canTransitionTo(WorkOrderStatus.IN_PROGRESS)).isTrue(); }
    @Test void onHold_canGoTo_cancelled()  { assertThat(WorkOrderStatus.ON_HOLD.canTransitionTo(WorkOrderStatus.CANCELLED)).isTrue(); }

    @Test void completed_canGoTo_closed()      { assertThat(WorkOrderStatus.COMPLETED.canTransitionTo(WorkOrderStatus.CLOSED)).isTrue(); }
    @Test void completed_cannotGoTo_inProgress() { assertThat(WorkOrderStatus.COMPLETED.canTransitionTo(WorkOrderStatus.IN_PROGRESS)).isFalse(); }

    @Test void closed_cannotGoAnywhere()    { assertThat(WorkOrderStatus.CLOSED.canTransitionTo(WorkOrderStatus.NEW)).isFalse(); }
    @Test void cancelled_cannotGoAnywhere() { assertThat(WorkOrderStatus.CANCELLED.canTransitionTo(WorkOrderStatus.NEW)).isFalse(); }
}
