/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import static km.common.command.CommandTestHelper.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.GenericEntity;
import org.iplass.mtp.entity.UpdateOption;
import org.iplass.mtp.test.AuthUser;
import org.iplass.mtp.test.MTPJUnitTestExtension;
import org.iplass.mtp.test.MTPTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

@ExtendWith(MTPJUnitTestExtension.class)
@DisplayName("InquiryTagUpdateCommand")
class InquiryTagUpdateCommandTest {

	private InquiryTagUpdateCommand command;
	private RequestContext request;
	private EntityManager em;

	@BeforeEach
	void setUp() {
		command = new InquiryTagUpdateCommand();
		request = mock(RequestContext.class);
		em = mock(EntityManager.class);
	}

	@Nested
	@DisplayName("アクセス制御")
	class AccessControl {

		@Test
		@AuthUser(userId = "testuser", password = "testuser")
		@DisplayName("回答者以外はタグを編集できない")
		void errorWhenNotResponder() {
			try (var dao = mockEntityDaoHelper(em, false)) {
				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "FORBIDDEN_NOT_RESPONDER");
			}
		}
	}

	@Nested
	@DisplayName("エラー条件")
	class ErrorConditions {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("存在しない問合せはINQUIRY_NOT_FOUND")
		void errorWhenNotFound() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("inq999");
				when(em.loadAndLock("inq999", "km.inquiry.Inquiry")).thenReturn(null);

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("ERROR", result);
				verifyErrorResponse(request, "INQUIRY_NOT_FOUND");
			}
		}
	}

	@Nested
	@DisplayName("タグ更新")
	class TagUpdate {

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("指定したタグOIDでタグが更新される")
		void successWithTags() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("inq001");
				when(request.getParams("tagOids")).thenReturn(new String[] {"tag001", "tag003"});

				Entity inquiry = new GenericEntity("km.inquiry.Inquiry");
				inquiry.setOid("inq001");
				when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("SUCCESS", result);

				verify(em)
						.update(
								argThat(e -> {
									Entity[] tags = e.getValue("tags");
									return tags != null
											&& tags.length == 2
											&& "tag001".equals(tags[0].getOid())
											&& "tag003".equals(tags[1].getOid());
								}),
								any(UpdateOption.class));
			}
		}

		@Test
		@AuthUser(userId = "testresponder", password = "testresponder")
		@DisplayName("タグOID未指定でタグがクリアされる")
		void successClearsTags() {
			try (var dao = mockEntityDaoHelper(em, true)) {
				when(request.getParam("oid")).thenReturn("inq001");
				when(request.getParams("tagOids")).thenReturn(null);

				Entity inquiry = new GenericEntity("km.inquiry.Inquiry");
				inquiry.setOid("inq001");
				when(em.loadAndLock("inq001", "km.inquiry.Inquiry")).thenReturn(inquiry);

				String result = MTPTest.invokeCommand(command, request);

				assertEquals("SUCCESS", result);

				verify(em)
						.update(
								argThat(e -> {
									Entity[] tags = e.getValue("tags");
									return tags == null;
								}),
								any(UpdateOption.class));
			}
		}
	}
}
