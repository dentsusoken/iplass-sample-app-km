/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.inquiry.command;

import static km.common.command.CommandTestHelper.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Map;
import km.inquiry.entity.Inquiry;
import org.iplass.mtp.auth.AuthContext;
import org.iplass.mtp.auth.AuthManager;
import org.iplass.mtp.auth.Group;
import org.iplass.mtp.auth.User;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.Entity;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.SelectValue;
import org.iplass.mtp.test.MTPJUnitTestExtension;
import org.iplass.mtp.test.MTPTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;

@ExtendWith(MTPJUnitTestExtension.class)
@DisplayName("InquiryCreateCommand")
class InquiryCreateCommandTest {

	private InquiryCreateCommand command;
	private RequestContext request;
	private EntityManager em;

	@BeforeEach
	void setUp() {
		command = new InquiryCreateCommand();
		request = mock(RequestContext.class);
		em = mock(EntityManager.class);
	}

	@Nested
	@DisplayName("validation")
	class Validation {

		@Test
		@DisplayName("returns VALIDATION_ERROR when name is null")
		void errorWhenNameNull() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("name")).thenReturn(null);
			when(request.getParam("content")).thenReturn("some content");

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "VALIDATION_ERROR");
		}

		@Test
		@DisplayName("returns VALIDATION_ERROR when name is empty")
		void errorWhenNameEmpty() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("name")).thenReturn("  ");
			when(request.getParam("content")).thenReturn("some content");

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "VALIDATION_ERROR");
		}

		@Test
		@DisplayName("returns VALIDATION_ERROR when content is empty")
		void errorWhenContentEmpty() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("name")).thenReturn("Test Inquiry");
			when(request.getParam("content")).thenReturn("  ");

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "VALIDATION_ERROR");
		}

		@Test
		@DisplayName("returns VALIDATION_ERROR when content is null")
		void errorWhenContentNull() {
			MTPTest.setManagerMock(EntityManager.class, em);
			when(request.getParam("name")).thenReturn("Test Inquiry");
			when(request.getParam("content")).thenReturn(null);

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "VALIDATION_ERROR");
		}
	}

	/**
	 * AuthContext.getCurrentContext().getUser() が指定したグループコードを持つユーザーを返すよう、
	 * AuthManager の mock をセットアップする。
	 */
	private void setUpAuthWithGroups(String... groupCodes) {
		AuthManager mockAM = mock(AuthManager.class);
		AuthContext mockCtx = mock(AuthContext.class);
		User mockUser = mock(User.class);
		Group[] groups = new Group[groupCodes.length];
		for (int i = 0; i < groupCodes.length; i++) {
			groups[i] = mock(Group.class);
			when(groups[i].getCode()).thenReturn(groupCodes[i]);
		}
		when(mockUser.getGroups()).thenReturn(groups);
		when(mockCtx.getUser()).thenReturn(mockUser);
		when(mockAM.getContext()).thenReturn(mockCtx);
		MTPTest.setManagerMock(AuthManager.class, mockAM);
	}

	@Nested
	@DisplayName("successful creation")
	class SuccessfulCreation {

		@Test
		@DisplayName("creates inquiry with status Open and initial post")
		@SuppressWarnings("unchecked") // Mockito の forClass() は型消去により raw 型を返すため不可避
		void createsInquiryAndPost() {
			MTPTest.setManagerMock(EntityManager.class, em);
			setUpAuthWithGroups("GRP001");
			when(request.getParam("name")).thenReturn("Test Inquiry");
			when(request.getParam("content")).thenReturn("Initial post content");
			when(request.getParamsAsFile("attachments")).thenReturn(null);

			// 先に Post を登録し、次に Inquiry を登録
			when(em.insert(any(Entity.class))).thenReturn("post001").thenReturn("inq001");

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);

			// 2 回の登録を検証: 先に post、次に posts 参照付きの inquiry
			ArgumentCaptor<Entity> entityCaptor = ArgumentCaptor.forClass(Entity.class);
			verify(em, times(2)).insert(entityCaptor.capture());

			Entity post = entityCaptor.getAllValues().get(0);
			assertEquals("Initial post content", post.getValue("content"));

			Entity inquiry = entityCaptor.getAllValues().get(1);
			assertEquals("Test Inquiry", inquiry.getName());
			SelectValue statusValue = inquiry.getValue("status");
			assertEquals("Open", statusValue.getValue());

			// inquiry に posts 参照が設定されていることを検証
			Object postsValue = inquiry.getValue("posts");
			assertNotNull(postsValue);
			assertTrue(postsValue instanceof Entity[]);
			Entity[] posts = (Entity[]) postsValue;
			assertEquals(1, posts.length);
			assertEquals("post001", posts[0].getOid());

			// レスポンスに inquiry の OID が含まれることを検証
			ArgumentCaptor<Map<String, Object>> responseCaptor = ArgumentCaptor.forClass(Map.class);
			verify(request).setAttribute(eq("result"), responseCaptor.capture());
			Map<String, Object> response = responseCaptor.getValue();
			Map<String, Object> data = (Map<String, Object>) response.get("data");
			assertEquals("inq001", data.get("oid"));
		}
	}

	@Nested
	@DisplayName("参照可能グループコード（作成時スナップショット）")
	class AccessibleGroupCodes {

		@Test
		@DisplayName("作成者の所属グループコードが全て保存される")
		void savesAllGroupCodes() {
			MTPTest.setManagerMock(EntityManager.class, em);
			setUpAuthWithGroups("GRP001", "GRP002");
			when(request.getParam("name")).thenReturn("Test Inquiry");
			when(request.getParam("content")).thenReturn("content");
			when(request.getParamsAsFile("attachments")).thenReturn(null);
			when(em.insert(any(Entity.class))).thenReturn("post001").thenReturn("inq001");

			MTPTest.invokeCommand(command, request);

			ArgumentCaptor<Entity> entityCaptor = ArgumentCaptor.forClass(Entity.class);
			verify(em, times(2)).insert(entityCaptor.capture());

			Entity inquiry = entityCaptor.getAllValues().get(1);
			String[] codes = inquiry.getValue(Inquiry.ACCESSIBLE_GROUP_CODES);
			assertNotNull(codes);
			assertArrayEquals(new String[] {"GRP001", "GRP002"}, codes);
		}

		@Test
		@DisplayName("グループ未所属でも問合せ作成は成功する（accessibleGroupCodesはnull）")
		void succeedsWithEmptyGroups() {
			MTPTest.setManagerMock(EntityManager.class, em);
			setUpAuthWithGroups(); // 空のグループ配列
			when(request.getParam("name")).thenReturn("Test Inquiry");
			when(request.getParam("content")).thenReturn("content");
			when(request.getParamsAsFile("attachments")).thenReturn(null);
			when(em.insert(any(Entity.class))).thenReturn("post001").thenReturn("inq001");

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);

			ArgumentCaptor<Entity> entityCaptor = ArgumentCaptor.forClass(Entity.class);
			verify(em, times(2)).insert(entityCaptor.capture());

			Entity inquiry = entityCaptor.getAllValues().get(1);
			String[] codes = inquiry.getValue(Inquiry.ACCESSIBLE_GROUP_CODES);
			assertNull(codes);
		}

		@Test
		@DisplayName("getGroups()がnullでも問合せ作成は成功する（accessibleGroupCodesはnull）")
		void succeedsWhenGroupsNull() {
			MTPTest.setManagerMock(EntityManager.class, em);
			AuthManager mockAM = mock(AuthManager.class);
			AuthContext mockCtx = mock(AuthContext.class);
			User mockUser = mock(User.class);
			when(mockUser.getGroups()).thenReturn(null);
			when(mockCtx.getUser()).thenReturn(mockUser);
			when(mockAM.getContext()).thenReturn(mockCtx);
			MTPTest.setManagerMock(AuthManager.class, mockAM);

			when(request.getParam("name")).thenReturn("Test Inquiry");
			when(request.getParam("content")).thenReturn("content");
			when(request.getParamsAsFile("attachments")).thenReturn(null);
			when(em.insert(any(Entity.class))).thenReturn("post001").thenReturn("inq001");

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);

			ArgumentCaptor<Entity> entityCaptor = ArgumentCaptor.forClass(Entity.class);
			verify(em, times(2)).insert(entityCaptor.capture());

			Entity inquiry = entityCaptor.getAllValues().get(1);
			String[] codes = inquiry.getValue(Inquiry.ACCESSIBLE_GROUP_CODES);
			assertNull(codes);
		}

		@Test
		@DisplayName("nullのグループコードは除外される")
		void filtersNullGroupCodes() {
			MTPTest.setManagerMock(EntityManager.class, em);
			AuthManager mockAM = mock(AuthManager.class);
			AuthContext mockCtx = mock(AuthContext.class);
			User mockUser = mock(User.class);
			Group validGroup = mock(Group.class);
			when(validGroup.getCode()).thenReturn("GRP001");
			Group nullCodeGroup = mock(Group.class);
			when(nullCodeGroup.getCode()).thenReturn(null);
			when(mockUser.getGroups()).thenReturn(new Group[] {validGroup, nullCodeGroup});
			when(mockCtx.getUser()).thenReturn(mockUser);
			when(mockAM.getContext()).thenReturn(mockCtx);
			MTPTest.setManagerMock(AuthManager.class, mockAM);

			when(request.getParam("name")).thenReturn("Test Inquiry");
			when(request.getParam("content")).thenReturn("content");
			when(request.getParamsAsFile("attachments")).thenReturn(null);
			when(em.insert(any(Entity.class))).thenReturn("post001").thenReturn("inq001");

			MTPTest.invokeCommand(command, request);

			ArgumentCaptor<Entity> entityCaptor = ArgumentCaptor.forClass(Entity.class);
			verify(em, times(2)).insert(entityCaptor.capture());

			Entity inquiry = entityCaptor.getAllValues().get(1);
			String[] codes = inquiry.getValue(Inquiry.ACCESSIBLE_GROUP_CODES);
			assertArrayEquals(new String[] {"GRP001"}, codes);
		}
	}
}
